import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
export interface FetchAlertActionTagSuggestionsOptions {
    services: {
        expressions: ExpressionsStart;
    };
    abortSignal?: AbortSignal;
}
export interface AlertActionTagSuggestionRow {
    tags: string;
}
/**
 * Returns up to 20 distinct tag values taken from each episode's latest TAG action
 * (see {@link buildAlertActionTagSuggestionsQuery}).
 */
export declare const fetchAlertActionTagSuggestions: ({ services: { expressions }, abortSignal, }: FetchAlertActionTagSuggestionsOptions) => Promise<AlertActionTagSuggestionRow[]>;
