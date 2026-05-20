import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
/**
 * Cleanup the given index mapping, removing info supposedly not relevant to an LLM,
 * such as `ignore_above` and such, to reduce the overall token length of response.
 */
export declare const cleanupMapping: (mapping: MappingTypeMapping) => MappingTypeMapping;
