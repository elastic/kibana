import type { GrokProcessor } from '../processors';
/**
 * Unwraps pattern definitions by recursively inlining them
 * into the provided patterns. This ensures that all patterns are fully
 * expanded, resolving any references to other patterns defined in the
 * `pattern_definitions` object. Prevents infinite recursion in case of
 * cyclic definitions.
 *
 * @param grokProcessor - An object containing GROK patterns and their definitions.
 * @returns An array of fully expanded patterns.
 */
export declare function unwrapPatternDefinitions(grokProcessor: Pick<GrokProcessor, 'patterns' | 'pattern_definitions'>): string[];
