import type { DissectPattern } from '../types';
export type ReviewFields = Record<string, {
    example_values: string[];
    position: number;
}>;
/**
 * Generates an object of fields with their example values and positions
 * for LLM review and ECS field mapping.
 */
export declare function getReviewFields(pattern: DissectPattern, numExamples?: number): ReviewFields;
/**
 * Result from LLM review of dissect fields where ECS field names have already been mapped to OpenTelemetry fields.
 */
export interface NormalizedReviewResult {
    log_source: string;
    fields: Array<{
        ecs_field: string;
        columns: string[];
    }>;
}
