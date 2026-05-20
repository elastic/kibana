import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { MappingField } from './types';
/**
 * Returns a flattened representation of the mappings, with all fields at the top level.
 */
export declare const flattenMapping: (mapping: MappingTypeMapping) => MappingField[];
