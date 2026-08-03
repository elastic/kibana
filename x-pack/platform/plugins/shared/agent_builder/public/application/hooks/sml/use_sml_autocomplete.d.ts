import type { SmlSearchFilters, SmlSearchConstraints } from '@kbn/agent-builder-sml-plugin/public';
export interface UseSmlAutocompleteOptions {
    /** Runtime-imposed per-type id-allowlist constraints (e.g. agent-centric connector allow-list). */
    readonly constraints?: SmlSearchConstraints;
    /** Caller-supplied type/tag refinements (e.g. connectors-only picker). */
    readonly filters?: SmlSearchFilters;
}
/**
 * Typeahead hook for the @ menu. Hits POST `/sml/_autocomplete`, which returns
 * per-row `matched_discovery_labels` (with `kind` for UI badging, and
 * `highlighted` when ES is able to produce a snippet).
 *
 * For full retrieval (LLM tool, content search), see `useSmlSearch`.
 */
export declare const useSmlAutocomplete: (query: string, options?: UseSmlAutocompleteOptions) => {
    results: import("@kbn/agent-builder-sml-plugin/public").SmlAutocompleteHttpResultItem[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
};
