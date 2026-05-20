import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
export interface FieldConstraints {
    type: string;
    ignore_above?: number;
    ignore_malformed?: boolean;
    [key: string]: unknown;
}
export declare const getEffectiveFieldConstraints: (esClient: ElasticsearchClient, streamName: string, fieldNames: string[]) => Promise<Map<string, FieldConstraints>>;
/**
 * Extracts the root-level `dynamic` mapping setting from an indices.getMapping response.
 * Uses the last index entry (the write index for a data stream). Defaults to 'true'
 * per the Elasticsearch default when the setting is absent.
 */
export declare const getEffectiveDynamicMapping: (mappingResponse: IndicesGetMappingResponse) => string;
/**
 * Derives an agent-facing note explaining what "unmapped" means given the
 * stream's effective `dynamic` mapping setting.
 */
export declare const getUnmappedFieldsNote: (dynamic: string | boolean) => string;
