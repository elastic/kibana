export declare const indexPatternSchema: import("@kbn/config-schema").ObjectType<{
    /** Pattern of index or indices for which to return stats. */
    indexPattern: import("@kbn/config-schema").Type<string>;
}>;
export declare const dataVisualizerFieldHistogramsSchema: import("@kbn/config-schema").ObjectType<{
    /** The fields to return histogram data. */
    fields: import("@kbn/config-schema").Type<any[]>;
    /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
    samplerShardSize: import("@kbn/config-schema").Type<number>;
    /** Optional search time runtime fields */
    runtimeMappings: import("@kbn/config-schema").ObjectType<{}>;
    /** Optional project routing */
    projectRouting: import("@kbn/config-schema").Type<string | undefined>;
    query: import("@kbn/config-schema").AnyType;
}>;
export declare const dataVisualizerFieldStatsSchema: import("@kbn/config-schema").ObjectType<{
    /** Query to match documents in the index. */
    query: import("@kbn/config-schema").AnyType;
    fields: import("@kbn/config-schema").Type<any[]>;
    /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
    samplerShardSize: import("@kbn/config-schema").Type<number>;
    /** Name of the time field in the index (optional). */
    timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
    /** Earliest timestamp for search, as epoch ms (optional). */
    earliest: import("@kbn/config-schema").Type<number | undefined>;
    /** Latest timestamp for search, as epoch ms (optional). */
    latest: import("@kbn/config-schema").Type<number | undefined>;
    /** Aggregation interval, in milliseconds, to use for obtaining document counts over time (optional). */
    interval: import("@kbn/config-schema").Type<number | undefined>;
    /** Maximum number of examples to return for text type fields.  */
    maxExamples: import("@kbn/config-schema").Type<number>;
    /** Optional search time runtime fields */
    runtimeMappings: import("@kbn/config-schema").ObjectType<{}>;
}>;
export declare const dataVisualizerOverallStatsSchema: import("@kbn/config-schema").ObjectType<{
    /** Query to match documents in the index. */
    query: import("@kbn/config-schema").AnyType;
    /** Names of aggregatable fields for which to return stats. */
    aggregatableFields: import("@kbn/config-schema").Type<string[]>;
    /** Names of non-aggregatable fields for which to return stats. */
    nonAggregatableFields: import("@kbn/config-schema").Type<string[]>;
    /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
    samplerShardSize: import("@kbn/config-schema").Type<number>;
    /** Name of the time field in the index (optional). */
    timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
    /** Earliest timestamp for search, as epoch ms (optional). */
    earliest: import("@kbn/config-schema").Type<number | undefined>;
    /** Latest timestamp for search, as epoch ms (optional). */
    latest: import("@kbn/config-schema").Type<number | undefined>;
    /** Optional search time runtime fields */
    runtimeMappings: import("@kbn/config-schema").ObjectType<{}>;
}>;
export declare const dataVisualizerFieldHistogramsResponse: () => import("@kbn/config-schema").AnyType;
