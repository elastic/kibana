import type { IKibanaSearchRequest } from '@kbn/search-types';
import type { ParsedDataSearchRequestDescriptor } from './types';
export declare const flattenDataSearchResponseDescriptor: <Request extends IKibanaSearchRequest, Response>({ abortController, options, request, response$, }: ParsedDataSearchRequestDescriptor<Request, Response>) => import("rxjs").Observable<{
    abortController: AbortController;
    options: import("@kbn/search-types").ISearchOptions;
    request: Request;
    response: import("./types").ParsedKibanaSearchResponse<Response>;
}>;
