import type { Suggestion } from '../components/data_management/shared/autocomplete_selector';
export interface ValueSuggestionsOptions {
    /** When true, array values are flattened to show individual elements as suggestions */
    flattenArrays?: boolean;
}
/**
 * Hook for providing value suggestions from enrichment simulation data - to be used with Enrichment only
 * @param field field name to extract unique values for
 * @param options configuration options for suggestion generation
 * @returns array of unique suggestions for the specified field
 */
export declare const useEnrichmentValueSuggestions: (field?: string, options?: ValueSuggestionsOptions) => Suggestion[];
/**
 * Hook for providing value suggestions from routing samples data - to be used with Routing only
 * @param field field name to extract unique values for
 * @param options configuration options for suggestion generation
 * @returns array of unique suggestions for the specified field
 */
export declare const useRoutingValueSuggestions: (field?: string, options?: ValueSuggestionsOptions) => Suggestion[];
