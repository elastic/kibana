import type { OperatorFunction } from 'rxjs';
import type { ReplaySubject } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import type { ParsedDataSearchRequestDescriptor, ParsedKibanaSearchResponse } from './types';
export type DataSearchRequestFactory<Args extends any[], Request extends IKibanaSearchRequest> = (...args: Args) => {
    request: Request;
    options: ISearchOptions;
} | null | undefined;
type ParseResponsesOperator<RawResponse, Response> = OperatorFunction<IKibanaSearchResponse<RawResponse>, ParsedKibanaSearchResponse<Response>>;
export declare const useDataSearch: <RequestFactoryArgs extends any[], RequestParams, Request extends IKibanaSearchRequest<RequestParams>, RawResponse, Response>({ getRequest, parseResponses, }: {
    getRequest: DataSearchRequestFactory<RequestFactoryArgs, Request>;
    parseResponses: ParseResponsesOperator<RawResponse, Response>;
}) => {
    requests$: ReplaySubject<ParsedDataSearchRequestDescriptor<Request, Response>>;
    search: (...args: RequestFactoryArgs) => {
        abortController: AbortController;
        response$: import("rxjs").Observable<ParsedKibanaSearchResponse<Response>>;
        request: Request;
        options: ISearchOptions;
    } | undefined;
};
export {};
