import type { ExpressionSuggestionType, SuggestionsProvider } from './types';
/**
 * Builds a suggestions provider from a flat list of candidate labels.
 *
 * Suggestions are filtered by the partial label already typed before the cursor (e.g. typing
 * `error c` suggests `error count`), and replace that partial text when selected. When the user
 * has an active text selection instead of just a cursor, filtering is skipped and picking a
 * suggestion replaces the whole selection.
 *
 * Labels that aren't valid bare ES|QL identifiers (e.g. containing spaces) are backtick-quoted
 * on insertion — unless the cursor is already inside a backtick the user opened themselves, in
 * which case the raw label is inserted and the closing backtick is completed for them.
 */
export declare const createLabelSuggestionsProvider: (labels: string[], type: ExpressionSuggestionType) => SuggestionsProvider;
