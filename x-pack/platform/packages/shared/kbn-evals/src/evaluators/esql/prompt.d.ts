export declare const EsqlEquivalencePrompt: import("@kbn/inference-common").Prompt<{
    ground_truth: string;
    prediction: string;
}, [{
    readonly system: {
        readonly mustache: {
            readonly template: string;
        };
    };
    readonly template: {
        readonly mustache: {
            readonly template: string;
        };
    };
    readonly toolChoice: {
        readonly function: "evaluate";
    };
    readonly tools: {
        readonly evaluate: {
            readonly description: "Assess the functional equivalence of the generated ES|QL query to the gold query.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly equivalent: {
                        readonly type: "string";
                        readonly enum: ["Yes", "No"];
                        readonly description: "Whether the generated ES|QL query is functionally equivalent to the gold query.";
                    };
                    readonly reason: {
                        readonly type: "string";
                        readonly description: "Briefly explain the reasoning behind your judgement.";
                    };
                };
                readonly required: ["equivalent", "reason"];
            };
        };
    };
}]>;
