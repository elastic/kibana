import type { OnPostAuthInterceptorDeps } from './on_post_auth_interceptor';
import type { OnRequestInterceptorDeps } from './on_request_interceptor';
export type InterceptorDeps = OnRequestInterceptorDeps & OnPostAuthInterceptorDeps;
export declare function initSpacesRequestInterceptors(deps: InterceptorDeps): void;
