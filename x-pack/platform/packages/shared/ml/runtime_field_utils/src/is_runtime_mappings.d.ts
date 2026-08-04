import type { estypes } from '@elastic/elasticsearch';
/**
 * Type guard for runtime mappings
 *
 * @param {unknown} arg - The item to be checked
 * @returns {arg is RuntimeMappings}
 */
export declare function isRuntimeMappings(arg: unknown): arg is RuntimeMappings;
/**
 * Alias for `estypes.MappingRuntimeFields`.
 */
export type RuntimeMappings = estypes.MappingRuntimeFields;
