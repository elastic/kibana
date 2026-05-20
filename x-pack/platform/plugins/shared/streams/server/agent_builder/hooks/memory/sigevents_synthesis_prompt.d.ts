export declare const SigeventsSynthesisPrompt: import("@kbn/inference-common").Prompt<{
    streamName: string;
    indicators: string;
    existingPages: string;
}, [{
    system: {
        mustache: {
            template: any;
        };
    };
    template: {
        mustache: {
            template: any;
        };
    };
    tools: {
        readonly read_memory_page: {
            readonly description: "Read the full content of an existing wiki page by name. Use before updating a page to understand what is already there.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "The wiki page name (e.g. \"nginx-overview\")";
                    };
                };
                readonly required: ["name"];
            };
        };
        readonly write_memory_page: {
            readonly description: "Create or update a wiki page. Content should be concise markdown — a few paragraphs at most.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "Unique page name (e.g. \"nginx-service\", \"streams-logs-otel-overview\")";
                    };
                    readonly title: {
                        readonly type: "string";
                        readonly description: "Human-readable page title";
                    };
                    readonly content: {
                        readonly type: "string";
                        readonly description: "Concise markdown content for the page";
                    };
                    readonly categories: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "Categories this page belongs to (e.g. [\"services\", \"streams/logs-otel\"]). Prefer services, infrastructure, or operations; use architecture only for holistic cross-stream docs.";
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
                readonly required: ["name", "title", "content", "categories"];
            };
        };
    };
}]>;
