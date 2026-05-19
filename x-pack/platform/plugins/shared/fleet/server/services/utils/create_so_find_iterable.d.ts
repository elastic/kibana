import type { SavedObjectsClientContract, SavedObjectsFindOptions, SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
export interface CreateSoFindIterableOptions<TDocument = unknown> {
    soClient: SavedObjectsClientContract;
    findRequest: Omit<SavedObjectsFindOptions, 'searchAfter' | 'page' | 'sortField' | 'pit'> & Pick<Required<SavedObjectsFindOptions>, 'sortField'>;
    /**
     * An optional callback for mapping the results retrieved from SavedObjects. If defined, the iterator
     * `value` will be set to the data returned by this mapping function.
     *
     * @param data
     */
    resultsMapper?: (data: SavedObjectsFindResponse<TDocument>) => any;
    /** If a Point in Time should be used while executing the search. Defaults to `true` */
    usePointInTime?: boolean;
}
export type InferSoFindIteratorResultValue<TDocument = unknown> = CreateSoFindIterableOptions<TDocument>['resultsMapper'] extends undefined ? SavedObjectsFindResponse<TDocument> : ReturnType<Required<CreateSoFindIterableOptions<TDocument>>['resultsMapper']>;
/**
 * Creates an `AsyncIterable` that can be used to iterate (ex. via `for..await..of`) over all the data
 * matching the search query. The search request to Saved Object will use `searchAfter`, thus can iterate over
 * datasets above 10k items as well.
 *
 * @param options
 */
export declare const createSoFindIterable: <TDocument = unknown>({ soClient, findRequest: { perPage, ...findOptions }, resultsMapper, usePointInTime, }: CreateSoFindIterableOptions<TDocument>) => AsyncIterable<InferSoFindIteratorResultValue<TDocument>>;
