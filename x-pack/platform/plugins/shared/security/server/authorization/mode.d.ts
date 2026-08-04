import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityLicense } from '../../common';
export declare function authorizationModeFactory(license: SecurityLicense): {
    useRbacForRequest(request: KibanaRequest): boolean;
};
