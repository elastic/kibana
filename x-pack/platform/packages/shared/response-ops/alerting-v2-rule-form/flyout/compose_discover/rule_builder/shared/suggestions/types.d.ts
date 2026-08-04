export type ExpressionSuggestionType = 'metric';
export interface ExpressionSuggestion {
    readonly type: ExpressionSuggestionType;
    readonly text: string;
    readonly start: number;
    readonly end: number;
    readonly cursorIndex?: number;
    readonly description?: string;
}
export interface SuggestionsProviderParams {
    readonly value: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
}
export type SuggestionsProvider = (params: SuggestionsProviderParams) => readonly ExpressionSuggestion[];
