/**
 * Returns a FROM-only query (e.g. `FROM logs-*`) extracted from a full ES|QL
 * pipeline. Used for index-level field lookups such as resolving the time field.
 */
export declare function extractFromSourceQuery(query: string): string;
