import featuresSystemPrompt from './system_prompt.text';
export { featuresSystemPrompt as featuresPrompt };
export declare function createIdentifyFeaturesPrompt({ systemPrompt }: {
    systemPrompt: string;
}): import("@kbn/inference-common").Prompt<{
    sample_documents: string;
    previously_identified_features: string;
    excluded_features: string;
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
        finalize_features: {
            description: string;
            schema: {
                readonly type: "object";
                readonly properties: {
                    readonly features: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                    readonly description: "Unique identifier for the feature.";
                                };
                                readonly type: {
                                    readonly type: "string";
                                };
                                readonly subtype: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                    readonly description: "A summary of the feature.";
                                };
                                readonly title: {
                                    readonly type: "string";
                                    readonly description: "Very short human-readable title for UI (e.g. table, flyout header).";
                                };
                                readonly properties: {
                                    readonly type: "object";
                                    readonly properties: {};
                                    readonly minProperties: 1;
                                    readonly description: "Core identifying properties of the feature (e.g. {\"name\": \"order-service\"}). Empty properties are invalid — every feature must have at least one stable identifying property.";
                                    readonly additionalProperties: true;
                                };
                                readonly confidence: {
                                    readonly type: "number";
                                    readonly minimum: 0;
                                    readonly maximum: 100;
                                };
                                readonly evidence: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "Supporting evidence from logs. Use `field.path=value` format for key-value pairs. For direct quotes, use plain unescaped text.";
                                };
                                readonly evidence_doc_ids: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "Evidence sources for traceability. This must be the Elasticsearch document `_id` values of sample documents that directly support the listed evidence. Keep an empty array when not applicable.";
                                };
                                readonly tags: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "The tags that describe the feature.";
                                };
                                readonly filter: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly field: {
                                            readonly type: "string";
                                            readonly description: "Field name for single equality filter.";
                                        };
                                        readonly eq: {
                                            readonly type: "string";
                                            readonly description: "Equality value for single filter. For numbers/booleans, string representation is allowed.";
                                        };
                                        readonly and: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly field: {
                                                        readonly type: "string";
                                                    };
                                                    readonly eq: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly required: readonly ["field", "eq"];
                                            };
                                        };
                                        readonly or: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly field: {
                                                        readonly type: "string";
                                                    };
                                                    readonly eq: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly required: readonly ["field", "eq"];
                                            };
                                        };
                                    };
                                    readonly description: "Optional condition used to scope filtering to the corresponding feature. Allowed forms: single equality `{field, eq}` or one-level `{and: [...]}` / `{or: [...]}` of equality conditions.";
                                };
                                readonly meta: {
                                    readonly type: "object";
                                    readonly properties: {};
                                    readonly description: "Useful metadata that is not captured in other properties.";
                                    readonly additionalProperties: true;
                                };
                            };
                            readonly required: readonly ["id", "type", "subtype", "description", "title", "properties", "confidence", "evidence", "tags"];
                        };
                    };
                    readonly ignored_features: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly feature_id: {
                                    readonly type: "string";
                                    readonly description: "The id of the new feature that matched an excluded one.";
                                };
                                readonly feature_title: {
                                    readonly type: "string";
                                    readonly description: "The title of the matched new feature.";
                                };
                                readonly excluded_feature_id: {
                                    readonly type: "string";
                                    readonly description: "The id of the excluded feature it matched.";
                                };
                                readonly reason: {
                                    readonly type: "string";
                                    readonly description: "Why this feature matches the excluded one.";
                                };
                            };
                            readonly required: readonly ["feature_id", "feature_title", "excluded_feature_id", "reason"];
                        };
                        readonly description: "Features not generated because they match an excluded feature. Empty array if no excluded features were provided or no matches found.";
                    };
                };
                readonly required: readonly ["features"];
            };
        };
    };
}]>;
