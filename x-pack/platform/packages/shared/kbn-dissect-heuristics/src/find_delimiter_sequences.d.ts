import type { DelimiterDetectionConfig } from './types';
/**
 * Find common delimiter sequences that appear in all messages
 *
 * Algorithm:
 * 1. Extract all substrings from all messages (length 1-10 chars)
 * 2. Filter to substrings that appear in ALL messages
 * 3. Filter out purely alphanumeric substrings (likely data, not delimiters)
 * 4. For each delimiter, find ALL occurrences in each message
 * 5. Score EACH occurrence separately by position consistency
 * 6. Keep delimiters where ANY occurrence meets the minimum score threshold
 * 7. Return unique delimiter literals (buildDelimiterTree will handle multiple occurrences)
 */
export declare function findDelimiterSequences(messages: string[], config?: DelimiterDetectionConfig): string[];
