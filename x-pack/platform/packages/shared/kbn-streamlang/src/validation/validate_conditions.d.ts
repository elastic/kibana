import type { Condition } from '../../types/conditions';
import type { StreamlangValidationError } from './types';
/**
 * Validates that a condition is complete (all required values are filled).
 *
 * @param condition - The condition to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @returns Array of validation errors for this condition
 */
export declare function validateCondition(condition: Condition | undefined, processorNumber: number, processorId: string): StreamlangValidationError[];
