import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface GetIndexMappingEntry {
    mappings: MappingTypeMapping;
}
export type GetIndexMappingsResult = Record<string, GetIndexMappingEntry>;
/**
 * Returns the mappings for each of the given indices.
 */
export declare const getIndexMappings: ({ indices, cleanup, esClient, }: {
    indices: string[];
    cleanup?: boolean;
    esClient: ElasticsearchClient;
}) => Promise<GetIndexMappingsResult>;
