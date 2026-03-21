/**
 * Represents the type of a "searchable" resource in the cluster.
 * Searchable resources are indices, aliases and data streams
 */
export declare enum EsResourceType {
    index = "index",
    alias = "alias",
    dataStream = "data_stream"
}
