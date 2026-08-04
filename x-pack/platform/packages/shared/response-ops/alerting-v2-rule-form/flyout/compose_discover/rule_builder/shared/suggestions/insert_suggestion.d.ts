import type { ExpressionSuggestion } from './types';
export interface InsertSuggestionResult {
    readonly value: string;
    readonly cursor: number;
}
/**
 * Applies a suggestion to the given value, replacing the suggestion's `start`-`end` range with
 * its `text`, and returning the cursor position to restore afterwards (`cursorIndex` within the
 * inserted text, or right after it by default).
 */
export declare const insertSuggestion: (value: string, suggestion: ExpressionSuggestion) => InsertSuggestionResult;
