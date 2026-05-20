import type { GrokPatternNode } from '../types';
export type ReviewFields = Record<string, {
    grok_component: string;
    example_values: string[];
}>;
/**
 * Generates an object of fields with their corresponding GROK component and example values.
 */
export declare function getReviewFields(nodes: GrokPatternNode[], numExamples?: number): ReviewFields;
/**
 * Result from LLM review of fields where ECS field names have already been mapped to OpenTelemetry fields.
 *
 * Example value:
 *
 * ```json
 * {
 *     "log_source": "Apache HTTP Server Log",
 *     "fields": [
 *         {
 *             "name": "@timestamp",
 *             "columns": ["field_0", "field_1", "field_2"],
 *             "grok_components": ["DAY", "SYSLOGTIMESTAMP", "YEAR"]
 *         },
 *         {
 *             "name": "log.level",
 *             "columns": ["field_3"],
 *             "grok_components": ["LOGLEVEL"]
 *         },
 *         {
 *             "name": "message",
 *             "columns": ["field_4"],
 *             "grok_components": ["GREEDYDATA"]
 *         }
 *     ]
 * }
 * ```
 */
export interface NormalizedReviewResult {
    log_source: string;
    fields: Array<{
        name: string;
        columns: string[];
        grok_components: string[];
    }>;
}
export declare function isCollapsiblePattern(pattern: string): boolean;
export declare function sanitize(value: string): string;
