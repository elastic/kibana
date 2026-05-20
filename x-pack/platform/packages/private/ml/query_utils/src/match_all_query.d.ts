/**
 * Represents a query that matches all documents.
 */
export declare const matchAllQuery: {
    /**
     * 'match_all' property specifies a query that matches all documents.
     */
    match_all: {};
};
/**
 * Checks if an argument is a `match_all` query.
 * @param {unknown} query - Argument to check.
 * @returns {boolean} True if `query` is a `match_all` query, false otherwise.
 */
export declare function isMatchAllQuery(query: unknown): boolean;
