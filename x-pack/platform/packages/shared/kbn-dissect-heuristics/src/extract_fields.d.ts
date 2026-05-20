import type { DelimiterNode, DissectField } from './types';
/**
 * Extract variable regions (fields) between delimiters
 *
 * Algorithm:
 * 1. Handle content before first delimiter (if any)
 * 2. Extract content between each pair of delimiters
 * 3. Handle content after last delimiter (if any)
 * 4. Create field objects with sample values and positions
 */
export declare function extractFields(messages: string[], delimiterTree: DelimiterNode[]): DissectField[];
