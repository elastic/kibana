import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
export declare function getUser(request: KibanaRequest, securityService: SecurityServiceStart): false | import("@kbn/core/server").AuthenticatedUser;
