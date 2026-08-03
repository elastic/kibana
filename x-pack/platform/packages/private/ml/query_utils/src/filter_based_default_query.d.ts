/**
 * Determines if the provided argument is a filter-based default query within a boolean filter context.
 *
 * A valid filter-based default query must include a `bool` property that contains
 * `filter`, `must`, and `must_not` properties. These properties should either be empty arrays
 * or arrays containing exactly one default query. The function checks for these conditions
 * to identify variants of default queries structured within a boolean filter.
 *
 * Examples of valid structures include:
 * - `{ bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } }`
 * - `{ bool: { filter: [], must: [{ match_all: {} }], must_not: [] } }`
 *
 * Useful to identify simple queries within bool queries
 * exposed from Kibana/EUI search bars.
 *
 * @param arg - The argument to be checked, its structure is unknown upfront.
 * @returns  Returns `true` if `arg` matches the expected structure of a
 * filter-based default query, otherwise `false`.
 */
export declare function isFilterBasedDefaultQuery(arg: unknown): boolean;
