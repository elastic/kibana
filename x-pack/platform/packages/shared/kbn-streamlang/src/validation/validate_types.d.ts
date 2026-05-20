import type { StreamlangProcessorDefinition } from '../../types/processors';
import type { FieldType, FieldTypeMap, StreamlangValidationError } from './types';
/**
 * Check if a processor has a conditional execution (where clause that's not always).
 * Returns true if the processor may not execute for all documents.
 */
export declare function isConditionalProcessor(processor: StreamlangProcessorDefinition): boolean;
/**
 * Extract field references from a processor.
 * This identifies fields that are being set/modified by the processor.
 */
export declare function extractModifiedFields(processor: StreamlangProcessorDefinition): string[];
/**
 * Get the expected output type for each processor action.
 */
export declare function getProcessorOutputType(processor: StreamlangProcessorDefinition, fieldName: string): FieldType;
/**
 * Check if a processor uses a field in a way that requires a specific type.
 */
export declare function getExpectedInputType(processor: StreamlangProcessorDefinition, fieldName: string): FieldType[] | null;
/**
 * Track field types AND validate type usage through the DSL pipeline.
 */
export declare function trackFieldTypesAndValidate(flattenedSteps: StreamlangProcessorDefinition[]): {
    fieldTypes: FieldTypeMap;
    errors: StreamlangValidationError[];
    fieldTypesByProcessor: Map<string, FieldTypeMap>;
};
