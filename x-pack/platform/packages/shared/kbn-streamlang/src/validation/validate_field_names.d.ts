import type { StreamlangProcessorDefinition } from '../../types/processors';
import type { Condition } from '../../types/conditions';
/**
 * Check if a field name contains invalid characters (brackets)
 */
export declare function hasInvalidFieldNameChars(fieldName: string): boolean;
/**
 * Extract all field names from a processor that should be validated for invalid characters
 */
export declare function extractAllFieldNames(processor: StreamlangProcessorDefinition): string[];
/**
 * Extract field names from a condition for validation
 */
export declare function extractFieldNamesFromCondition(condition: Condition): string[];
