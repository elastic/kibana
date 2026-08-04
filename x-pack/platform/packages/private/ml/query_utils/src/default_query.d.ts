import type { SearchQueryVariant } from './types';
/**
 * Checks if the provided query is a default query. A default query is considered as one that matches all documents,
 * either directly through a `match_all` query, a `SimpleQuery` with a wildcard query string, or a `BoolFilterBasedSimpleQuery`
 * that contains a filter with a wildcard query or a `match_all` condition.
 *
 * @param query - The query to check.
 * @returns True if the query is a default query, false otherwise.
 */
export declare function isDefaultQuery(query: SearchQueryVariant): boolean;
