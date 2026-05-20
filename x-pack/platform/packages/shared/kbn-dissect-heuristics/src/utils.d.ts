/**
 * Calculate the median of an array of numbers
 */
export declare function median(values: number[]): number;
/**
 * Calculate the variance of an array of numbers
 */
export declare function variance(values: number[]): number;
/**
 * Determine if a string is likely a delimiter vs. data
 * Delimiters typically:
 * - Contain NO alphanumeric characters (except whitespace)
 * - Are short (1-10 chars)
 * - Consist of punctuation, symbols, or whitespace
 */
export declare function isLikelyDelimiter(str: string): boolean;
/**
 * Score delimiter quality for single-message processing
 * Higher scores indicate better structural delimiters
 *
 * Priority order:
 * 1. Multi-character delimiters with mixed punctuation (e.g., ": ", "][")
 * 2. Multi-character whitespace-based (e.g., "  ")
 * 3. Single structural characters (e.g., "[", "(", "|")
 * 4. Single space (lowest priority, causes fragmentation)
 */
export declare function scoreDelimiterQuality(delimiter: string): number;
/**
 * Analyze messages for bracket/parenthesis mismatches.
 * Returns a set of bracket characters that participate in unmatched pairs
 * across any message (either an opener without closer or an unexpected closer).
 * Supported bracket types: (), [], {}.
 */
export declare function analyzeBracketMismatches(messages: string[]): Set<string>;
/**
 * Analyze bracket structure for: unmatched openers, mismatched closers, crossing patterns, and depth variance.
 * Returns detailed structure info used for advanced delimiter penalties.
 */
export interface BracketStructureInfo {
    unmatchedOpeners: Set<string>;
    mismatchedClosers: Set<string>;
    crossingPairs: Set<string>;
    depthSamples: Record<string, number[]>;
}
export declare function analyzeBracketStructure(messages: string[]): BracketStructureInfo;
/**
 * Analyze ordering consistency between bracket characters. We look at the first occurrence
 * position of each structural bracket character per message. For each pair ( ( vs [, ( vs {, [ vs { )
 * we record the relative ordering among messages that contain both. If both orderings occur
 * (A before B and B before A) across the corpus, we mark both characters as unstable.
 */
export declare function analyzeBracketOrdering(messages: string[]): Set<string>;
/**
 * Find the common character-by-character prefix across multiple messages
 */
export declare function findCommonPrefix(messages: string[]): {
    prefix: string;
    hasStructure: boolean;
    prefixLength: number;
};
/**
 * Find common structured prefix by detecting repeated token patterns
 * even when the actual token values vary.
 * Returns the length of the structured prefix in characters.
 */
export declare function findStructuredPrefixLength(messages: string[]): number;
/**
 * Check if a string looks like an IPv4 address
 */
export declare function looksLikeIPv4(str: string): boolean;
/**
 * Check if a string looks like an IPv6 address
 */
export declare function looksLikeIPv6(str: string): boolean;
/**
 * Check if a message contains IP addresses
 */
export declare function containsIPAddress(message: string): boolean;
/**
 * Extract all possible substrings of a given string within a length range
 */
export declare function extractSubstrings(str: string, minLength?: number, maxLength?: number): string[];
/**
 * Find the position of a substring in a string
 * Returns -1 if not found
 */
export declare function findPosition(str: string, substring: string): number;
/**
 * Calculate consistency score for delimiter positions
 *
 * This is lenient about small positional differences that occur naturally
 * when alphanumeric fields have varying lengths (e.g., "INFO" vs "ERROR").
 *
 * For example, if positions are [10, 10, 11], this indicates the delimiter
 * appears at nearly the same position, with only a 1-character variance.
 * This is normal and expected when fields like log levels have different
 * lengths (INFO=4 chars, ERROR=5 chars).
 */
export declare function calculatePositionScore(positions: number[]): number;
/**
 * Count occurrences of a substring in an array of strings
 */
export declare function countOccurrences(messages: string[], substring: string): number;
/**
 * Get unique values from an array
 */
export declare function unique<T>(arr: T[]): T[];
/**
 * Check if all values in an array are the same
 */
export declare function allSame<T>(arr: T[]): boolean;
/**
 * Trim leading and trailing whitespace from each string
 */
export declare function trimAll(strings: string[]): string[];
/**
 * Detect trailing whitespace lengths in strings
 */
export declare function getTrailingWhitespaceLengths(values: string[]): number[];
/**
 * Detect leading whitespace lengths in strings
 */
export declare function getLeadingWhitespaceLengths(values: string[]): number[];
