import type { GrokProcessorResult } from './get_grok_processor';
/**
 * Merges multiple GrokProcessorResult objects into a single result.
 * - Combines patterns and ensures unique pattern definitions by renaming duplicates.
 * - Merges descriptions from all processors into a single string.
 *
 * @param grokProcessors - Array of GrokProcessorResult objects to merge.
 * @returns A single GrokProcessorResult with merged patterns, definitions, and descriptions.
 */
export declare function mergeGrokProcessors(grokProcessors: GrokProcessorResult[]): GrokProcessorResult;
