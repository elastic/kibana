export declare const ConversationScraperPrompt: import("@kbn/inference-common").Prompt<{
    conversationCount: number;
    conversationSummaries: string;
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
        readonly get_conversation_details: {
            readonly description: "Fetch the full rounds of a conversation by its index number. Returns user messages and assistant responses.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly index: {
                        readonly type: "number";
                        readonly description: "The index of the conversation to fetch (from the summaries list)";
                    };
                };
                readonly required: ["index"];
            };
        };
        readonly read_memory_page: {
            readonly description: "Read the full content of an existing wiki page by name. Use before updating a page.";
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
            readonly description: "Create or update a wiki page. Content should be concise markdown.";
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
                        readonly description: "Concise markdown content";
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
    };
}]>;
