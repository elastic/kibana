import type { Condition } from '@kbn/streamlang';
export declare function computeRuleId(assetUuid: string, query: string): string;
/**
 * @deprecated Legacy helper that converts a KQL query + optional feature filter
 * into an ES|QL query string. Only used for storage migration of pre-existing
 * KQL-based queries. Always includes `METADATA _id, _source` so the resulting
 * query is self-contained for alerting rules.
 */
export declare const buildEsqlQueryFromKql: (indices: string[], input: {
    kql: {
        query: string;
    };
    feature?: {
        name: string;
        filter: Condition;
        type: "system";
    };
}) => string;
