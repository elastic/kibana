import type { StreamlangProcessorDefinition } from '../../types/processors';
import type { StreamlangValidationError } from './types';
/**
 * Check if a field is a namespaced ECS field or an allowed keep field.
 * Based on the logic from @kbn/streams-schema/src/helpers/namespaced_ecs.ts
 *
 * Namespaced ECS fields follow the pattern: namespace.field or namespace.nested.field
 * Examples: attributes.custom, body.structured.data, resource.attributes.host
 *
 * Keep fields are special fields that are allowed without namespacing:
 * @timestamp, trace_id, span_id, severity_text, body, severity_number, event_name, etc.
 */
export declare function isNamespacedEcsField(fieldName: string): boolean;
/**
 * Validates that fields modified by a processor are properly namespaced.
 * This validation only applies to wired streams.
 *
 * @param step - The processor step to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @returns Array of validation errors for non-namespaced fields
 */
export declare function validateNamespacing(step: StreamlangProcessorDefinition, processorNumber: number, processorId: string): StreamlangValidationError[];
/**
 * Validates that a processor doesn't modify reserved/system fields.
 *
 * @param step - The processor step to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @param reservedFields - List of field names that cannot be modified
 * @returns Array of validation errors for reserved field violations
 */
export declare function validateReservedFields(step: StreamlangProcessorDefinition, processorNumber: number, processorId: string, reservedFields: string[]): StreamlangValidationError[];
