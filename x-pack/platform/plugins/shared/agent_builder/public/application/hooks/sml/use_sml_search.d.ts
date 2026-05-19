import type { SmlSearchFilters } from '@kbn/agent-context-layer-plugin/public';
export interface UseSmlSearchOptions {
    /** When true, the server omits indexed `content` on each hit (smaller payload; e.g. command-menu autocomplete). */
    readonly skipContent?: boolean;
    /** Per-type filters for SML search. */
    readonly filters?: SmlSearchFilters;
}
export declare const useSmlSearch: (query: string, options?: UseSmlSearchOptions) => {
    results: import("@kbn/agent-context-layer-plugin/public").SmlSearchHttpResultItem[];
    total: number;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
};
