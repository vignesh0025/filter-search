import { EventEmitter } from 'stream';
import * as vscode from 'vscode';

export class Search {

    private searchTreeView: vscode.TreeView<SearchTreeItem> | undefined;
    private searchTreeProvider: SearchTreeDataProvider | undefined;
    private searchTreeLabel: SearchTreeLabel | undefined;

    private decoration = vscode.window.createTextEditorDecorationType({
                        "backgroundColor": "Yellow"
                    });

    private clearDecorations(){
        vscode.window.activeTextEditor?.setDecorations(this.decoration, []);
        // TODO: Clear Decorations in all open text editors
    }
    /**
     * registerProviderscontext
     */
    constructor(context: vscode.ExtensionContext) {

        context.subscriptions.push(vscode.commands.registerCommand("filter-search.clearresults", () => {
            this.searchTreeProvider?.clear(); 
            this.clearDecorations();
        }));

        context.subscriptions.push(vscode.commands.registerCommand("filter-search.search", () => {
            vscode.window.showInputBox({ "prompt": "Enter value to search" }).then((value) => {
                let document = vscode.window.activeTextEditor?.document;
                if (document) {
                    let searchTreeItems: SearchTreeItem[] = [];
                    for (let lineNo = 0; lineNo < document.lineCount; lineNo++) {
                        if(document.lineAt(lineNo).text.includes(value!))
                        {
                            let s = document.lineAt(lineNo).text;
                            searchTreeItems.push(new SearchTreeItem(
                                s,
                                document.uri,
                                lineNo,
                                vscode.TreeItemCollapsibleState.None
                            ));
                        }
                    }

                    if(searchTreeItems.length > 0){
                        this.searchTreeLabel = new SearchTreeLabel(document.fileName, searchTreeItems, vscode.TreeItemCollapsibleState.Expanded);
                        this.searchTreeProvider?.refresh(this.searchTreeLabel);
                        this.searchTreeView?.reveal(searchTreeItems[0]); // TODO: We don't need to reveal any item ideally
                    }
                }
            });
        }));

        this.searchTreeProvider = new SearchTreeDataProvider();
        // context.subscriptions.push(vscode.window.registerTreeDataProvider("search-view", new SearchTreeDataProvider()));

        this.searchTreeView = vscode.window.createTreeView("search-view", { 
            "treeDataProvider": this.searchTreeProvider,
            "showCollapseAll": true
        });

        context.subscriptions.push(vscode.commands.registerCommand("filter-search.jumptoline", (uri: vscode.Uri, line: number) => {
            let currentDoc = vscode.window.activeTextEditor?.document;
            if(currentDoc?.uri.path !== uri.path) {
                vscode.window.showTextDocument(uri);
            }

            let range = currentDoc?.lineAt(line).range;
            
            if(range){
                if (vscode.window.activeTextEditor) {
                    vscode.window.activeTextEditor.selection = new vscode.Selection(range.start, range.end);
                    vscode.window.activeTextEditor.setDecorations(this.decoration, []);
                    vscode.window.activeTextEditor.setDecorations(this.decoration, [range]);
                    vscode.window.activeTextEditor.revealRange(range);
                }
            }

            //console.log("line no: " + " " + uri.path + " " +line);
        }));
    }
}

export class SearchTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    /*
    onDidChangeTreeData is the event that gets called when we need to update the tree.
    We are attaching that to a evenrEmitter and firing that event to trigger the onDidChangeTreeData
    */
    private eventEmitter = new vscode.EventEmitter<any>();
    private searchTreeLabels: SearchTreeLabel[] = [];
    onDidChangeTreeData = this.eventEmitter.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        // console.log(element.label);
        return element;
    }

    public clear(){
        this.searchTreeLabels = [];
        this.eventEmitter.fire(undefined);
    }

    public refresh(searchTreeLabel: SearchTreeLabel){
        // console.log("Refrsh");
        this.searchTreeLabels.push(searchTreeLabel);
        this.eventEmitter.fire(undefined);
    }

    getChildren(element?: SearchTreeItem | SearchTreeLabel | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        if (element) {
            if(element instanceof SearchTreeLabel)
            {
                return element.getSearchTreeItems();
            } else {
                return [];
            }
        } else {
            return this.searchTreeLabels;
        }
    } 
}

export class SearchTreeLabel extends vscode.TreeItem {

    public searchTreeItems: SearchTreeItem[] = [];
    constructor(label: string, searchTreeItems: SearchTreeItem[], collapsableState: vscode.TreeItemCollapsibleState)
    {
        super(label, collapsableState);
        this.searchTreeItems = searchTreeItems;
    }

    public getSearchTreeItems(): SearchTreeItem[]
    {
        return this.searchTreeItems;
    }
}


export class SearchTreeItem extends vscode.TreeItem {
    public uri: vscode.Uri;
    public lineno: number;
    constructor(label: string, uri: vscode.Uri, line: number, collapsibleState: vscode.TreeItemCollapsibleState | undefined){
        super(line.toString(), collapsibleState);
        this.description = label;
        this.tooltip = label;
        this.uri = uri;
        this.lineno = line;
        this.command = {
            "command" : "filter-search.jumptoline",
            "arguments": [this.uri, this.lineno],
            "title" : "jump to point",
        };
    }
}
