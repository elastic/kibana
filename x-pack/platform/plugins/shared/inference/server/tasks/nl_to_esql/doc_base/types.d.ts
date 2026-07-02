export interface GetDocsOptions {
    /**
     * If true (default), will include general ES|QL documentation entries
     * such as the overview, syntax and operators page.
     */
    addOverview?: boolean;
    /**
     * If true (default) will try to resolve aliases for commands.
     */
    resolveAliases?: boolean;
    /**
     * If true (default) will generate a fake doc page for missing keywords.
     * Useful for the LLM to understand that the requested keyword does not exist.
     */
    generateMissingKeywordDoc?: boolean;
    /**
     * If true (default), additional documentation will be included to help the LLM.
     * E.g. for STATS, BUCKET will be included.
     */
    addSuggestions?: boolean;
}
