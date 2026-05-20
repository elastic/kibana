import type { estypes } from '@elastic/elasticsearch';
import type { EsQueryConfig } from '@kbn/es-query';
export declare function excludeFrozenQuery(): estypes.QueryDslQueryContainer[];
export declare function kqlQuery(kql?: string, esQueryConfig?: EsQueryConfig): estypes.QueryDslQueryContainer[];
export declare function rangeQuery(start?: number, end?: number, field?: string): estypes.QueryDslQueryContainer[];
export declare function isKqlQueryValid(kql?: string, esQueryConfig?: EsQueryConfig): boolean;
/**
 * Builds a combined filter for ES|QL queries following the same pattern
 * as the server-side route used to apply.
 */
export declare function buildEsqlFilter({ filter, kuery, start, end, esQueryConfig, }: {
    filter?: estypes.QueryDslQueryContainer;
    kuery?: string;
    start?: number;
    end?: number;
    esQueryConfig?: EsQueryConfig;
}): estypes.QueryDslQueryContainer;
