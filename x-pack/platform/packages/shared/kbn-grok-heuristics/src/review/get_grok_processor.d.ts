import type { GrokPatternNode } from '../types';
import type { NormalizedReviewResult } from './get_review_fields';
export interface GrokProcessorResult {
    description: string;
    patterns: string[];
    pattern_definitions?: Record<string, string>;
}
/**
 * Generates a GROK processor definition by combining extracted tokens and
 * the result of an LLM review. It constructs a root GROK pattern and
 * optionally defines custom pattern definitions for fields with multiple
 * columns, ensuring patterns are validated and adjusted based on example
 * values.
 *
 * Special handling: Multi-column groupings that end with GREEDYDATA are
 * collapsed to a single GREEDYDATA field instead of creating a complex
 * custom pattern definition (since all preceding patterns are redundant).
 */
export declare function getGrokProcessor(nodes: GrokPatternNode[], reviewResult: NormalizedReviewResult): GrokProcessorResult;
