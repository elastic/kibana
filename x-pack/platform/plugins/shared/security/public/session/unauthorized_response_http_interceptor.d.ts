import type { HttpInterceptor, HttpInterceptorResponseError, IAnonymousPaths, IHttpInterceptController } from '@kbn/core/public';
import type { SessionExpired } from './session_expired';
export declare class UnauthorizedResponseHttpInterceptor implements HttpInterceptor {
    private sessionExpired;
    private anonymousPaths;
    constructor(sessionExpired: SessionExpired, anonymousPaths: IAnonymousPaths);
    responseError(httpErrorResponse: HttpInterceptorResponseError, controller: IHttpInterceptController): void;
}
