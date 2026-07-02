import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { AnonymizationState, DetectedMatch } from './types';
/**
 * Processes detected matches by resolving overlaps and applying masks to records.
 * Returns updated state with masked records and anonymizations.
 */
export declare function resolveOverlapsAndMask({ detectedMatches, state, rules, salt, }: {
    detectedMatches: DetectedMatch[];
    state: AnonymizationState;
    rules: RegexAnonymizationRule[];
    salt?: string;
}): AnonymizationState;
