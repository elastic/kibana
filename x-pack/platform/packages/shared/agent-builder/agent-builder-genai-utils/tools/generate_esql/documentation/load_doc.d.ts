export declare enum EsqlDocEntry {
    syntax = "syntax.md",
    examples = "examples.md",
    tsQueries = "ts_queries.md"
}
export interface EsqlLoadedDocumentation {
    getDocContent(entry: EsqlDocEntry): string;
}
export declare const _loadDocumentation: () => Promise<EsqlLoadedDocumentation>;
/**
 * Memoized variant of {@link _loadDocumentation}. Loads the documentation lazily
 * on first call and returns the cached promise on subsequent calls.
 */
export declare const loadDocumentation: () => Promise<EsqlLoadedDocumentation>;
