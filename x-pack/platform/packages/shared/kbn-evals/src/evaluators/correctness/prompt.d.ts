export declare const LlmCorrectnessEvaluationPrompt: import("@kbn/inference-common").Prompt<{
    user_query: string;
    agent_response: string;
    ground_truth_response?: string | undefined;
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
    readonly tools: {
        readonly analyze: {
            readonly description: "Return correctness evaluation with summary and detailed claim analysis.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly summary: {
                        readonly type: "object";
                        readonly properties: {
                            readonly factual_accuracy_summary: {
                                readonly type: "string";
                                readonly description: "Overall factual accuracy assessment.";
                                readonly enum: ["ACCURATE", "MINOR_INACCURACIES", "MAJOR_INACCURACIES"];
                            };
                            readonly relevance_summary: {
                                readonly type: "string";
                                readonly description: "Overall relevance assessment of the response.";
                                readonly enum: ["RELEVANT", "PARTIALLY_RELEVANT", "IRRELEVANT"];
                            };
                            readonly sequence_accuracy_summary: {
                                readonly type: "string";
                                readonly description: "Overall sequence accuracy assessment for procedural queries.";
                                readonly enum: ["MATCH", "MISMATCH", "NOT_APPLICABLE"];
                            };
                        };
                        readonly required: ["factual_accuracy_summary", "relevance_summary", "sequence_accuracy_summary"];
                        readonly description: "High-level summary of the correctness evaluation.";
                    };
                    readonly analysis: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly claim: {
                                    readonly type: "string";
                                    readonly description: "The specific claim extracted from the agent response.";
                                };
                                readonly centrality: {
                                    readonly type: "string";
                                    readonly description: "Whether the claim is central or peripheral to answering the user query.";
                                    readonly enum: ["central", "peripheral"];
                                };
                                readonly centrality_reason: {
                                    readonly type: "string";
                                    readonly description: "A brief explanation of why the claim is central or peripheral.";
                                };
                                readonly verdict: {
                                    readonly type: "string";
                                    readonly description: "Factual accuracy verdict for the claim against ground truth.";
                                    readonly enum: ["FULLY_SUPPORTED", "PARTIALLY_SUPPORTED", "CONTRADICTED", "NOT_IN_GROUND_TRUTH"];
                                };
                                readonly sequence_match: {
                                    readonly type: "string";
                                    readonly description: "Whether the claim appears in the correct sequence relative to other claims.";
                                    readonly enum: ["MATCH", "MISMATCH", "NOT_APPLICABLE"];
                                };
                                readonly justification_snippet: {
                                    readonly type: "string";
                                    readonly nullable: true;
                                    readonly description: "A direct snippet from the Ground Truth Response supporting the verdict, or null if not applicable.";
                                };
                                readonly explanation: {
                                    readonly type: "string";
                                    readonly description: "A brief explanation of the verdict reasoning.";
                                };
                            };
                            readonly required: ["claim", "centrality", "centrality_reason", "verdict", "sequence_match", "justification_snippet", "explanation"];
                        };
                        readonly description: "Detailed analysis of each claim in the agent response.";
                    };
                };
                readonly required: ["summary", "analysis"];
            };
        };
    };
}]>;
