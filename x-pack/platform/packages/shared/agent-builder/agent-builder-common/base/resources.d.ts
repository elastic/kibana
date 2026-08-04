/**
 * Represents the type of a "searchable" resource in the cluster.
 * Concrete resources are indices, aliases and data streams.
 * `indexPattern` denotes a multi-target or wildcard target resolved via field caps.
 * `dataset` denotes an external ES|QL dataset (registered via `_query/dataset`), only
 * queryable through ES|QL `FROM <name>`.
 */
export declare enum EsResourceType {
    index = "index",
    alias = "alias",
    dataStream = "data_stream",
    indexPattern = "index_pattern",
    dataset = "dataset"
}
