import type { ISearchGeneric } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import type { ESQLSearchResponse } from '@kbn/es-types';
interface ExecuteEsqlParams {
    query: string;
    search: ISearchGeneric;
    signal?: AbortSignal;
    filter?: estypes.QueryDslQueryContainer;
    timezone?: string;
    kuery?: string;
    start?: number;
    end?: number;
    dropNullColumns?: boolean;
}
/**
 * Executes an ES|QL query using the data plugin's search service.
 * This replaces the previous /internal/streams/esql route by executing queries client-side.
 *
 * @param params - Query execution parameters
 * @returns Promise resolving to the ES|QL search response
 */
export declare function executeEsqlQuery({ query, search, signal, dropNullColumns, filter, timezone, kuery, start, end, }: ExecuteEsqlParams): Promise<ESQLSearchResponse>;
export {};
