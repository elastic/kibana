export declare const LlmCriteriaEvaluationPrompt: import("@kbn/inference-common").Prompt<{
    input: string;
    output: string;
    criteria: string[];
    metadata?: string | undefined;
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
        readonly function: "score";
    };
    readonly tools: {
        readonly score: {
            readonly description: "Return PASS, FAIL, or N/A for every evaluation criterion.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly criteria: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                    readonly description: "The unique identifier of the criterion.";
                                };
                                readonly reason: {
                                    readonly type: "string";
                                    readonly description: "Briefly explain the reasoning behind your judgement";
                                };
                                readonly result: {
                                    readonly type: "string";
                                    readonly description: "Outcome of evaluating the criterion.";
                                    readonly enum: ["PASS", "FAIL", "N/A"];
                                };
                            };
                            readonly required: ["id", "result"];
                        };
                        readonly description: "A verdict for every criterion.";
                    };
                };
                readonly required: ["criteria"];
            };
        };
    };
}]>;
