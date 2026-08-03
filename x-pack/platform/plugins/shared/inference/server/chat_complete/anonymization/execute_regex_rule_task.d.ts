import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { DetectedMatch } from './types';
/**
 * Executes multiple regex anonymization rules against records to detect all matches.
 * - Processes rules in order, preserving rule precedence via ruleIndex
 * - Returns all matches with their original positions in the unmodified text
 *
 * @param rules - Array of regex anonymization rules to execute
 * @param records - Array of record objects with string field values to search
 * @returns Array of detected matches with position, content, and rule metadata
 */
export declare const executeRegexRulesTask: ({ rules, records, }: {
    rules: RegexAnonymizationRule[];
    records: Array<Record<string, string>>;
}) => DetectedMatch[];
