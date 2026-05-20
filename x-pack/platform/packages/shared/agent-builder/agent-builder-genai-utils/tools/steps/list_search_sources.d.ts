import type { ElasticsearchClient } from '@kbn/core/server';
import { EsResourceType } from '@kbn/agent-builder-common';
export interface DataStreamSearchSource {
    type: EsResourceType.dataStream;
    name: string;
    indices: string[];
    timestamp_field: string;
}
export interface AliasSearchSource {
    type: EsResourceType.alias;
    name: string;
    indices: string[];
}
export interface IndexSearchSource {
    type: EsResourceType.index;
    name: string;
}
export type EsSearchSource = DataStreamSearchSource | AliasSearchSource | IndexSearchSource;
export interface ListSourcesResponse {
    indices: IndexSearchSource[];
    aliases: AliasSearchSource[];
    data_streams: DataStreamSearchSource[];
    warnings?: string[];
}
/**
 * List the search sources (indices, aliases and datastreams) matching a given index pattern,
 * using the `_resolve_index` API.
 */
export declare const listSearchSources: ({ pattern, perTypeLimit, includeHidden, excludeIndicesRepresentedAsAlias, excludeIndicesRepresentedAsDatastream, esClient, }: {
    pattern: string;
    perTypeLimit?: number;
    includeHidden?: boolean;
    excludeIndicesRepresentedAsAlias?: boolean;
    excludeIndicesRepresentedAsDatastream?: boolean;
    esClient: ElasticsearchClient;
}) => Promise<ListSourcesResponse>;
