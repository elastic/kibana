/**
 * Extracts column names from the BY clause of a STATS command in an ES|QL query.
 *
 * Uses `getESQLStatsQueryMeta` from `@kbn/esql-utils` which parses the query
 * and extracts metadata about STATS commands including the group by fields.
 *
 * @param query - The ES|QL query string
 * @returns Array of column/field names from the BY clause
 *
 * @example
 * getGroupByColumnsFromQuery('FROM logs-* | STATS count() BY host.name')
 * // Returns: ['host.name']
 *
 * @example
 * getGroupByColumnsFromQuery('FROM logs-* | STATS count() BY host.name, service.name')
 * // Returns: ['host.name', 'service.name']
 */
export declare const getGroupByColumnsFromQuery: (query: string) => string[];
interface UseDefaultGroupByProps {
    query: string;
}
export declare const useDefaultGroupBy: ({ query }: UseDefaultGroupByProps) => {
    defaultGroupBy: string[];
};
export {};
