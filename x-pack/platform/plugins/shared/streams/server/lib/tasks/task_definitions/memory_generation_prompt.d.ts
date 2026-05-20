export declare const MemorySynthesisPrompt: import("@kbn/inference-common").Prompt<{
    streamName: string;
    indicatorCount: number;
    indicatorSummaries: string;
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
        readonly get_indicator_details: {
            readonly description: "Fetch full details of a specific indicator by its index number. Use selectively — only fetch indicators you need to understand for synthesis.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly index: {
                        readonly type: "number";
                        readonly description: "The index of the indicator to fetch (from the summaries list)";
                    };
                };
                readonly required: ["index"];
            };
        };
        readonly read_memory_page: {
            readonly description: "Read the full content of an existing wiki page by name. Use before updating a page to understand what is already there.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly description: "The wiki page name (e.g. \"nginx-service-overview\")";
                    };
                };
                readonly required: ["name"];
            };
        };
        readonly write_memory_page: {
            readonly description: "Create or update a wiki page. If a page already exists with the given name, it will be updated. Content should be concise markdown — a few paragraphs at most.";
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
                        readonly description: "Categories (e.g. [\"services\", \"streams/logs-otel\"]). Prefer services, infrastructure, or operations; use architecture only for holistic cross-stream docs.";
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
