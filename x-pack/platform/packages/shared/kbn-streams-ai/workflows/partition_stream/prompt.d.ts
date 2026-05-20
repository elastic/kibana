import type { Streams } from '@kbn/streams-schema';
export declare const SuggestStreamPartitionsPrompt: import("@kbn/inference-common").Prompt<{
    stream: Streams.all.Definition;
    condition_schema: string;
    initial_clustering: string;
    user_prompt?: string | undefined;
    existing_partitions?: string | undefined;
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
        get_stream_features: {
            description: string;
            schema: {
                type: "object";
                properties: {
                    feature_types: {
                        type: "array";
                        items: {
                            type: "string";
                            enum: readonly "entity"[];
                        };
                    };
                    min_confidence: {
                        type: "number";
                        minimum: number;
                        maximum: number;
                    };
                    limit: {
                        type: "number";
                        minimum: number;
                    };
                };
            };
        };
        partition_logs: {
            readonly description: "Simulates the partioning conditions specified, and clusters documents within each partition.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly index: {
                        readonly type: "string";
                    };
                    readonly partitions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                };
                                readonly condition: {
                                    readonly type: "object";
                                    readonly properties: {};
                                };
                            };
                            readonly required: ["name", "condition"];
                        };
                    };
                };
                readonly required: ["index"];
            };
        };
    };
}]>;
