export declare const LlmGroundednessEvaluationPrompt: import("@kbn/inference-common").Prompt<{
    user_query: string;
    agent_response: string;
    tool_call_history?: string | undefined;
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
            readonly description: "Return groundedness evaluation with summary and detailed claim analysis.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly analysis: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly claim: {
                                    readonly type: "string";
                                    readonly description: "The specific claim extracted from the agent's response.";
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
                                    readonly description: "Groundedness verdict for the claim against evidence.";
                                    readonly enum: ["FULLY_SUPPORTED", "PARTIALLY_SUPPORTED", "CONTRADICTED", "NOT_FOUND", "UNGROUNDED_BUT_DISCLOSED"];
                                };
                                readonly evidence: {
                                    readonly type: "object";
                                    readonly nullable: true;
                                    readonly properties: {
                                        readonly tool_call_id: {
                                            readonly type: "string";
                                            readonly nullable: true;
                                            readonly description: "The ID of the tool call or null.";
                                        };
                                        readonly tool_id: {
                                            readonly type: "string";
                                            readonly nullable: true;
                                            readonly description: "The name of the tool or null.";
                                        };
                                        readonly evidence_snippet: {
                                            readonly type: "string";
                                            readonly nullable: true;
                                            readonly description: "A direct snippet from the tool result or null.";
                                        };
                                    };
                                    readonly required: ["tool_call_id", "tool_id", "evidence_snippet"];
                                    readonly description: "Evidence supporting the verdict from tool calls.";
                                };
                                readonly explanation: {
                                    readonly type: "string";
                                    readonly description: "A brief explanation of the verdict reasoning.";
                                };
                            };
                            readonly required: ["claim", "centrality", "centrality_reason", "verdict", "evidence", "explanation"];
                        };
                        readonly description: "Detailed analysis of each claim in the agent response.";
                    };
                    readonly summary_verdict: {
                        readonly type: "string";
                        readonly description: "Overall groundedness assessment of the response.";
                        readonly enum: ["GROUNDED", "GROUNDED_WITH_DISCLOSURE", "MINOR_HALLUCINATIONS", "MAJOR_HALLUCINATIONS"];
                    };
                };
                readonly required: ["summary_verdict", "analysis"];
            };
        };
    };
}]>;
