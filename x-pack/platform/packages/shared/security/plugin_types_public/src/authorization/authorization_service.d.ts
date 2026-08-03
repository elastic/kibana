import type { PrivilegesAPIClientPublicContract } from '../privileges';
import type { RolesAPIClient } from '../roles';
export interface AuthorizationServiceSetup {
    /**
     * Determines if role management is enabled.
     */
    isRoleManagementEnabled: () => boolean | undefined;
    /**
     * A set of methods to work with Kibana user roles.
     */
    roles: RolesAPIClient;
    /**
     * A set of methods to work with Kibana role privileges
     */
    privileges: PrivilegesAPIClientPublicContract;
}
/**
 * Start has the same contract as Setup for now.
 */
export type AuthorizationServiceStart = AuthorizationServiceSetup;
