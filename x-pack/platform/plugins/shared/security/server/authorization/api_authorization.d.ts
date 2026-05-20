import type { HttpServiceSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { AuthorizationServiceSetup, EsSecurityConfig } from '@kbn/security-plugin-types-server';
interface InitApiAuthorization extends AuthorizationServiceSetup {
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
    getSecurityConfig: () => Promise<EsSecurityConfig>;
}
export declare function initAPIAuthorization(http: HttpServiceSetup, { actions, checkPrivilegesDynamicallyWithRequest, checkPrivilegesWithRequest, mode, getCurrentUser, getSecurityConfig, }: InitApiAuthorization, logger: Logger): void;
export {};
