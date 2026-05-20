import type { KibanaRequest } from '@kbn/core/server';
import type { ReportingCore } from '../../core';
import type { ReportingUser } from '../../types';
interface GetAuthorizedUserOptions {
    /** If true, throws if security is disabled. Default: false */
    requireSecurity?: boolean;
}
export declare function getAuthorizedUser(reporting: ReportingCore, req: KibanaRequest, options?: GetAuthorizedUserOptions): Promise<ReportingUser>;
export {};
