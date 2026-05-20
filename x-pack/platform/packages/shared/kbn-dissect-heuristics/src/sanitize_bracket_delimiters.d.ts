import type { DelimiterNode } from './types';
/**
 * Sanitize delimiter literals by removing bracket characters that participate in
 * mismatched or unmatched pairs when scanning left-to-right.
 *
 * A character is considered unstable if:
 * - It is a closing bracket whose expected opener is not at the top of the stack
 * - It is an opening bracket left unmatched at the end of the scan
 * - An unexpected closer causes both the closer and the top opener to be marked
 *
 * All occurrences of unstable bracket characters are removed from delimiter literals.
 * Delimiters whose literals become empty after sanitization are dropped entirely.
 */
export declare function sanitizeBracketDelimiters(tree: DelimiterNode[]): DelimiterNode[];
