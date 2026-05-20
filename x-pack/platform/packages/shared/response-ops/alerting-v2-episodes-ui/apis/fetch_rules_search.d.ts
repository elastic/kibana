import type { HttpStart } from '@kbn/core-http-browser';
export interface FetchRulesSearchParams {
    http: HttpStart;
    query: string;
}
/**
 * Search rules by name via the internal rules API.
 * Used by the rule filter dropdown to find rules beyond those already loaded for the table.
 */
export declare function fetchRulesSearch({ http, query, }: FetchRulesSearchParams): Promise<Array<{
    label: string;
    value: string;
}>>;
