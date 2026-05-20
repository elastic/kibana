import type { GrokPatternNode } from '../types';
/**
 * WARNING: DO NOT RUN THIS FUNCTION ON THE MAIN THREAD
 *
 * Extracts structured fields (nodes) from an array of log messages by analyzing
 * patterns, delimiters, and column structures.
 *
 * This function performs multiple passes to identify consistent tokenization patterns
 * and normalize the data into a structured format. It is computationally intensive
 * and should not be run on the main thread.
 *
 * Steps:
 * 1. Masks specific patterns (e.g. quoted strings, parentheses) in the messages.
 * 2. Detects the most likely delimiter (e.g. whitespace, `|`, `;`).
 * 3. Splits messages into columns using the detected delimiter and tokenizes them.
 * 4. Identifies consistent split characters for further tokenization.
 * 5. Refines tokenization using consistent split characters.
 * 6. Normalizes columns into a unified structure across all messages.
 * 7. Identifies useful columns and collapses others into a single GREEDYDATA column.
 * 8. Flattens the structured columns into a list of tokens with delimiters inlined.
 */
export declare function extractGrokPatternDangerouslySlow(messages: string[]): GrokPatternNode[];
