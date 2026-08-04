import type { TextMatch, CommandDefinition } from './types';
/**
 * Given the text preceding the cursor, finds the command whose trigger
 * sequence (e.g. "@", "/") is closest to the cursor at a word boundary.
 *
 * A sequence inside another command's query (e.g. the "/" in
 * "@connector/workday") is never a word boundary, so it's never mistaken
 * for a new trigger — no extra bookkeeping needed for that case.
 */
export declare const matchCommand: (textBeforeCursor: string, definitions: readonly CommandDefinition[]) => TextMatch;
