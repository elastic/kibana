export declare const EsqlPrompt: import("@kbn/inference-common").Prompt<{
    prompt: string;
    esql_system_prompt: string;
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
    temperature: number;
    tools: {
        readonly get_documentation: {
            readonly description: "Get documentation about specific ES|QL commands or functions";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly commands: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly functions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: ["commands", "functions"];
            };
        };
        readonly validate_queries: {
            readonly description: "Validate one or more ES|QL queries for syntax errors and/or mapping issues";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly queries: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: ["queries"];
            };
        };
        readonly run_queries: {
            readonly description: "Run one or more validated ES|QL queries and retrieve the results";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly queries: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: ["queries"];
            };
        };
        readonly list_datasets: {
            readonly description: "List datasets (index, data stream, aliases) based on a name or pattern, similar to _resolve/_index";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: ["name"];
            };
        };
        readonly describe_dataset: {
            readonly description: "Get dataset description via sampling of documents";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly index: {
                        readonly type: "string";
                        readonly description: "Index, data stream or index pattern you want to analyze";
                    };
                    readonly kql: {
                        readonly type: "string";
                        readonly description: "KQL for filtering the data";
                    };
                };
                readonly required: ["index"];
            };
        };
    };
}]>;
