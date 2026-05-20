/**
 * Represents the type of a "searchable" resource in the cluster.
 * Concrete resources are indices, aliases and data streams.
 * `indexPattern` denotes a multi-target or wildcard target resolved via field caps.
 */
export declare enum EsResourceType {
    index = "index",
    alias = "alias",
    dataStream = "data_stream",
    indexPattern = "index_pattern"
}
