import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
export interface CreateEsSearchIterableOptions<TDocument = unknown> {
    esClient: ElasticsearchClient;
    searchRequest: Omit<SearchRequest, 'search_after' | 'from' | 'sort' | 'pit' | 'index'> & Pick<Required<SearchRequest>, 'sort' | 'index'>;
    /**
     * An optional callback for mapping the results retrieved from ES. If defined, the iterator
     * `value` will be set to the data returned by this mapping function.
     *
     * @param data
     */
    resultsMapper?: (data: SearchResponse<TDocument>) => any;
    /** If a Point in Time should be used while executing the search. Defaults to `true` */
    usePointInTime?: boolean;
}
export type InferEsSearchIteratorResultValue<TDocument = unknown> = CreateEsSearchIterableOptions<TDocument>['resultsMapper'] extends undefined ? SearchResponse<TDocument> : ReturnType<Required<CreateEsSearchIterableOptions<TDocument>>['resultsMapper']>;
/**
 * Creates an `AsyncIterable` that can be used to iterate (ex. via `for..await..of`) over all the data
 * matching the search query. The search request to ES will use `search_after`, thus can iterate over
 * datasets above 10k items as well.
 *
 * @param options
 *
 * @example
 *
 *  const yourFn = async () => {
 *    const dataIterable = createEsSearchIterable({
 *      esClient,
 *      searchRequest: {
 *        index: 'some-index',
 *        sort: [
 *          {
 *            created: { order: 'asc' }
 *          }
 *        ]
 *      }
 *    });
 *
 *    for await (const data of dataIterable) {
 *      // data === your search results
 *    }
 *  }
 */
export declare const createEsSearchIterable: <TDocument = unknown>({ esClient, searchRequest: { size, index, ...searchOptions }, resultsMapper, usePointInTime, }: CreateEsSearchIterableOptions<TDocument>) => AsyncIterable<InferEsSearchIteratorResultValue<TDocument>>;
