import type { FlattenRecord } from '@kbn/streams-schema';
import type { DetectedField } from '../../../../state_management/simulation_state_machine/types';
export interface FieldSuggestion {
    name: string;
}
/**
 * Create field suggestions from simulation records and detected fields
 * Uses the centralized field ordering logic from simulation state machine
 */
export declare function createFieldSuggestions(previewRecords?: FlattenRecord[], detectedFields?: DetectedField[]): FieldSuggestion[];
