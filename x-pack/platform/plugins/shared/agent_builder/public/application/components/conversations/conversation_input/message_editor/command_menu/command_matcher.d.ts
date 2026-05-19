import type { CommandMatchResult, CommandDefinition } from './types';
/**
 * Given the text preceding the cursor, checks if any registered command
 * is active. Returns the command whose sequence appears closest to the cursor.
 *
 * The algorithm checks every registered command, finds the last word-boundary
 * occurrence of each sequence, and picks the one nearest to the cursor position.
 */
export declare const matchCommand: (textBeforeCursor: string, definitions: readonly CommandDefinition[]) => CommandMatchResult;
