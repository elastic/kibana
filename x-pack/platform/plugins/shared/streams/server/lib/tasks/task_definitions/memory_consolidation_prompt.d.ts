export declare const MemoryConsolidationPrompt: import("@kbn/inference-common").Prompt<{
    entryCount: number;
    existingPages: string;
}, [{
    system: {
        mustache: {
            template: string;
        };
    };
    template: {
        mustache: {
            template: string;
        };
    };
    tools: {
        readonly read_memory_page: {
            readonly description: "Read the full content of a wiki page by name.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "The wiki page name";
                    };
                };
                readonly required: ["name"];
            };
        };
        readonly write_memory_page: {
            readonly description: "Create or update a wiki page.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "Unique page name";
                    };
                    readonly title: {
                        readonly type: "string";
                        readonly description: "Human-readable page title";
                    };
                    readonly content: {
                        readonly type: "string";
                        readonly description: "Markdown content";
                    };
                    readonly categories: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "Categories this page belongs to";
                    };
                    readonly references: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "IDs of other pages referenced from this content";
                    };
                    readonly tags: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "Tags for classification";
                    };
                };
                readonly required: ["name", "title", "content"];
            };
        };
        readonly delete_memory_page: {
            readonly description: "Delete a wiki page. Use after merging duplicate content into another page.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "The wiki page name to delete";
                    };
                };
                readonly required: ["name"];
            };
        };
        readonly get_recent_changes: {
            readonly description: string;
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly size: {
                        readonly type: "number";
                        readonly description: "Maximum number of recent changes to return (default 20)";
                    };
                };
            };
        };
    };
}]>;
