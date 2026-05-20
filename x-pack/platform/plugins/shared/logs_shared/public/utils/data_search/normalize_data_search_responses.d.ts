import type { Observable } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchStrategyError } from '../../../common/search_strategies/common/errors';
import type { ParsedKibanaSearchResponse } from './types';
export type RawResponseParser<RawResponse, Response> = (rawResponse: RawResponse) => {
    data: Response;
    errors?: SearchStrategyError[];
};
/**
 * An operator factory that normalizes each {@link IKibanaSearchResponse} by
 * parsing it into a {@link ParsedKibanaSearchResponse} and adding initial
 * responses and error handling.
 *
 * @param initialResponse - The initial value to emit when a new request is
 * handled.
 * @param projectResponse - The projection function to apply to each response
 * payload. It should validate that the response payload is of the type {@link
 * RawResponse} and decode it to a {@link Response}.
 *
 * @return An operator that adds parsing and error handling transformations to
 * each response payload using the arguments given above.
 */
export declare const normalizeDataSearchResponses: <RawResponse, Response, InitialResponse>(initialResponse: InitialResponse, parseRawResponse: RawResponseParser<RawResponse, Response>) => (response$: Observable<IKibanaSearchResponse<RawResponse>>) => Observable<ParsedKibanaSearchResponse<Response | InitialResponse>>;
