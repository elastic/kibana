import type { StreamlangDSL } from '../../types/streamlang';
import type { FieldType, FieldTypeMap, StreamlangValidationError, StreamlangValidationOptions, StreamlangValidationResult } from './types';
export type { FieldType, FieldTypeMap, StreamlangValidationError };
export type { StreamlangValidationOptions, StreamlangValidationResult };
export { validationErrorTypeLabels, KEEP_FIELDS, NAMESPACE_PREFIXES } from './constants';
/**
 * Validates a Streamlang DSL for condition completeness, processor values, and (for wired streams)
 * namespacing requirements, reserved field usage, and type safety.
 *
 * For ALL streams, this validates that:
 * - Field names don't contain illegal characters (brackets)
 * - remove_by_prefix is not used within where blocks
 * - Conditions are complete (all required values filled, range conditions have both bounds)
 * - Processor-specific values are valid (expressions, patterns, date formats etc.)
 *
 * For WIRED streams only (streamType: 'wired'), this additionally validates that:
 * - manual_ingest_pipeline processors are not used (forbidden in wired streams)
 * - All generated fields are properly namespaced (contain at least one dot)
 * - Custom fields are placed in approved namespaces like: attributes, body.structured, resource.attributes
 * - Processors don't modify reserved/system fields
 * - Fields are used with compatible types
 *
 * @param streamlangDSL - The Streamlang DSL to validate
 * @param options - Validation options (reservedFields, streamType)
 * @returns Validation result with any errors found
 */
export declare function validateStreamlang(streamlangDSL: StreamlangDSL, options: StreamlangValidationOptions): StreamlangValidationResult;
