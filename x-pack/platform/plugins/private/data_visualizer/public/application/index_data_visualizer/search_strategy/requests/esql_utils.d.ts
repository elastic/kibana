export interface ESQLQuery {
    esql: string;
}
/**
 * Helper function to escape special characters for field names used in ES|QL queries.
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-syntax.html#esql-identifiers
 * @param str
 * @returns "`str`"
 **/
export declare const getSafeESQLName: (str: string) => string;
export declare function isESQLQuery(arg: unknown): arg is ESQLQuery;
export declare const PERCENTS: number[];
export declare const getESQLPercentileQueryArray: (fieldName: string, percents?: number[]) => string[];
