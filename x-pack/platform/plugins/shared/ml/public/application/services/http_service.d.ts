import type { Observable } from 'rxjs';
import type { HttpFetchOptionsWithPath, HttpStart } from '@kbn/core/public';
/**
 * ML Http Service
 */
export declare class HttpService {
    private httpStart;
    getLoadingCount$: Observable<number>;
    constructor(httpStart: HttpStart);
    /**
     * Creates an Observable from Kibana's HttpHandler.
     */
    private fromHttpHandler;
    /**
     * Function for making HTTP requests to Kibana's backend.
     * Wrapper for Kibana's HttpHandler.
     */
    http<T>(options: HttpFetchOptionsWithPath): Promise<T>;
    /**
     * Function for making HTTP requests to Kibana's backend which returns an Observable
     * with request cancellation support.
     */
    http$<T>(options: HttpFetchOptionsWithPath): Observable<T>;
}
