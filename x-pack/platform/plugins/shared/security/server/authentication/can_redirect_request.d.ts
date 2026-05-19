import type { KibanaRequest } from '@kbn/core/server';
/**
 * Checks whether we can reply to the request with redirect response. We can do that
 * only for non-AJAX and non-API requests.
 * @param request HapiJS request instance to check redirection possibility for.
 */
export declare function canRedirectRequest(request: KibanaRequest): boolean;
