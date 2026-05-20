import { type ToolDefinition } from '@kbn/inference-common';
import significantEventsSystemPrompt from './system_prompt.text';
export { significantEventsSystemPrompt as significantEventsPrompt };
export declare function createGenerateSignificantEventsPrompt({ systemPrompt, additionalTools, }: {
    systemPrompt: string;
    additionalTools?: Record<string, ToolDefinition>;
}): import("@kbn/inference-common").Prompt<{
    name: string;
    description: string;
    available_feature_types: string;
    computed_feature_instructions: string;
    existing_queries: string;
}, [{
    system: {
        mustache: {
            template: string;
        };
    };
    template: {
        mustache: {
            template: any;
        };
    };
    tools: {
        readonly get_stream_features: {
            readonly description: "Fetches extracted stream features for this stream. Supports optional filtering by type, confidence, and limit.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly feature_types: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly enum: readonly ["entity", "infrastructure", "technology", "dependency", "schema", "dataset_analysis", "log_samples", "log_patterns", "error_logs"];
                        };
                    };
                    readonly min_confidence: {
                        readonly type: "number";
                        readonly minimum: 0;
                        readonly maximum: 100;
                    };
                    readonly limit: {
                        readonly type: "number";
                        readonly minimum: 1;
                    };
                };
            };
        };
        readonly add_queries: {
            readonly description: "Add queries to suggest to the user";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly queries: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly esql: {
                                    readonly type: "string";
                                };
                                readonly title: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                    readonly description: "A semantically searchable description explaining what the query detects and why it matters. Should be 1-2 sentences that help users find this query when searching by concept or intent.";
                                };
                                readonly category: {
                                    readonly type: "string";
                                    readonly enum: ["operational", "configuration", "error", "resource_health", "security"];
                                };
                                readonly severity_score: {
                                    readonly type: "number";
                                    readonly minimum: 0;
                                    readonly maximum: 100;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: ["match", "stats"];
                                    readonly description: "Hint for query type. \"match\" for WHERE-only filters, \"stats\" for aggregation queries. The system derives the authoritative type from ES|QL content.";
                                };
                                readonly evidence: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly replaces: {
                                    readonly type: "string";
                                    readonly description: "If this query replaces an existing one (same detection intent but updated ES|QL), set this to the ID of the existing query from `existing_queries`.";
                                };
                                readonly feature_ids: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "IDs of the features (from get_stream_features) that informed this query. Each ID must match a feature `id` returned by a previous get_stream_features call.";
                                };
                            };
                            readonly required: ["esql", "title", "description", "category", "severity_score", "feature_ids"];
                        };
                    };
                };
                readonly required: ["queries"];
            };
        };
    };
}]>;
