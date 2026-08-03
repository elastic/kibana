import type { estypes } from '@elastic/elasticsearch';
/**
 * Type guard for a runtime field
 *
 * @param {unknown} arg - The item to be checked
 * @returns {arg is estypes.MappingRuntimeField}
 */
export declare function isRuntimeField(arg: unknown): arg is estypes.MappingRuntimeField;
