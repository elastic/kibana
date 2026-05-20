import { type DissectGrokPatternField, type PatternParseResult } from '../formats/dissect';
/**
 * Parses a single DISSECT pattern and extracts field information.
 * DISSECT (both ingest and ES|QL) always emits string (keyword) values; any inline type
 * suffixes like :int or :float are NOT supported and are treated as part of the literal name.
 */
export declare function parseDissectPattern(pattern: string): DissectGrokPatternField[];
export declare function parseMultiDissectPatterns(patterns: string[]): PatternParseResult;
