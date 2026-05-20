import type { StreamlangProcessorDefinition } from '../../types/processors';
import type { StreamlangValidationError } from './types';
/**
 * Validates processor-specific values such as expressions, patterns, and date formats etc.
 *
 * @param step - The processor step to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @returns Array of validation errors for this processor
 */
export declare function validateProcessorValues(step: StreamlangProcessorDefinition, processorNumber: number, processorId: string): StreamlangValidationError[];
