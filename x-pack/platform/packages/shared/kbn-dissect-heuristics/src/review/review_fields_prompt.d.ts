export declare const ReviewDissectFieldsPrompt: import("@kbn/inference-common").Prompt<{
    sample_messages: string[];
    review_fields: string;
}, [{
    template: {
        mustache: {
            template: any;
        };
    };
    toolChoice: {
        function: "validate_response_schema";
    };
    tools: {
        validate_response_schema: {
            readonly description: "Validate the response schema to ensure the output adheres to the defined structure.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly log_source: {
                        readonly type: "string";
                    };
                    readonly fields: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly ecs_field: {
                                    readonly type: "string";
                                };
                                readonly columns: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly required: ["ecs_field", "columns"];
                        };
                    };
                };
                readonly required: ["log_source", "fields"];
            };
        };
    };
}]>;
