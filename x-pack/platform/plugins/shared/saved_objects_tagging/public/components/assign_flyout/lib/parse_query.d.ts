import type { Query } from '@elastic/eui';
export interface ParsedQuery {
    /**
     * Combined value of the term clauses
     */
    queryText?: string;
    /**
     * The values of the `type` field clause (that are populated by the `type` filter)
     */
    selectedTypes?: string[];
}
export declare function parseQuery(query: Query): ParsedQuery;
