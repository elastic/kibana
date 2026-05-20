import type { DissectGrokPatternField, PatternParseResult } from '../formats/dissect';
/**
 * Parses a single GROK pattern and extracts field information.
 * GROK syntax: %{SYNTAX:SEMANTIC[:TYPE]} where TYPE may be int | long | float.
 * If TYPE is omitted, default type is keyword.
 * Alias-only pattern like %{COMBINEDAPACHELOG} has no SEMANTIC, so yields no fields.
 */
export declare function parseGrokPattern(pattern: string): DissectGrokPatternField[];
/**
 * Parses multiple GROK patterns and extracts all field information.
 */
export declare function parseMultiGrokPatterns(patterns: string[]): PatternParseResult;
