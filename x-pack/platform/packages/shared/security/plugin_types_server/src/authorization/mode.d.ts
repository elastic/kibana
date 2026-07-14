import type { KibanaRequest } from '@kbn/core/server';
export interface AuthorizationMode {
    useRbacForRequest(request: KibanaRequest): boolean;
}
