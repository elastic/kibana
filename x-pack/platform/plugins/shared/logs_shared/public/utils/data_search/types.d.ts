import type { Observable } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import type { SearchStrategyError } from '../../../common/search_strategies/common/errors';
export interface DataSearchRequestDescriptor<Request extends IKibanaSearchRequest, RawResponse> {
    request: Request;
    options: ISearchOptions;
    response$: Observable<IKibanaSearchResponse<RawResponse>>;
    abortController: AbortController;
}
export interface ParsedDataSearchRequestDescriptor<Request extends IKibanaSearchRequest, ResponseData> {
    request: Request;
    options: ISearchOptions;
    response$: Observable<ParsedKibanaSearchResponse<ResponseData>>;
    abortController: AbortController;
}
export interface ParsedKibanaSearchResponse<ResponseData> {
    total?: number;
    loaded?: number;
    isRunning: boolean;
    isPartial: boolean;
    data: ResponseData;
    errors: SearchStrategyError[];
}
export interface ParsedDataSearchResponseDescriptor<Request extends IKibanaSearchRequest, Response> {
    request: Request;
    options: ISearchOptions;
    response: ParsedKibanaSearchResponse<Response>;
    abortController: AbortController;
}
