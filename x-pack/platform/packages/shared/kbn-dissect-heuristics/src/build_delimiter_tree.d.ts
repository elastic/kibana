import type { DelimiterNode } from './types';
/**
 * Build an ordered delimiter tree by finding positions and ordering by median position
 *
 * Algorithm:
 * 1. Find ALL positions of each delimiter in each message
 * 2. Group by occurrence index (1st occurrence, 2nd occurrence, etc.)
 * 3. Calculate median position across all messages for each occurrence
 * 4. Calculate variance to measure position consistency
 * 5. Sort by median position (left to right)
 * 6. Filter out delimiters with too much position variance (optional)
 */
export declare function buildDelimiterTree(messages: string[], delimiters: string[], maxVariance?: number): DelimiterNode[];
