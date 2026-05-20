import type { DissectPattern } from './types';
/**
 * WARNING: DO NOT RUN THIS FUNCTION ON THE MAIN THREAD
 *
 * Extracts a Dissect pattern from an array of log messages by analyzing
 * common delimiters and structure.
 *
 * This function performs multiple passes to identify consistent delimiter patterns
 * and normalize the data into a structured format. It is computationally intensive
 * (O(n × m²) complexity) and should not be run on the main thread.
 *
 * Steps:
 * 1. Find common delimiter sequences that appear in all messages.
 * 2. Build an ordered delimiter tree by position.
 * 3. Extract variable regions between delimiters as fields.
 * 4. Detect modifiers (right padding, skip fields).
 * 5. Generate the final Dissect pattern string.
 *
 * @param messages - Array of log message strings to analyze
 * @returns DissectPattern object with pattern string and field metadata
 */
export declare function extractDissectPattern(messages: string[]): DissectPattern;
