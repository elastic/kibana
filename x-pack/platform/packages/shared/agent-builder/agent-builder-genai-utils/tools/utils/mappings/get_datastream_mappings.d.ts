import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface GetDataStreamMappingEntry {
    mappings: MappingTypeMapping;
}
export type GetDataStreamMappingsResults = Record<string, GetDataStreamMappingEntry>;
export interface GetDataStreamMappingsResItem {
    name: string;
    effective_mappings: MappingTypeMapping | {
        _doc: MappingTypeMapping;
    };
}
export interface GetDataStreamMappingsRes {
    data_streams: GetDataStreamMappingsResItem[];
}
/**
 * Returns the mappings for each of the given datastreams.
 */
export declare const getDataStreamMappings: ({ datastreams, cleanup, esClient, }: {
    datastreams: string[];
    cleanup?: boolean;
    esClient: ElasticsearchClient;
}) => Promise<GetDataStreamMappingsResults>;
