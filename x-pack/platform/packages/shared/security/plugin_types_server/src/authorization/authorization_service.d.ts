import type { Actions } from './actions';
import type { CheckPrivilegesWithRequest } from './check_privileges';
import type { CheckPrivilegesDynamicallyWithRequest } from './check_privileges_dynamically';
import type { CheckSavedObjectsPrivilegesWithRequest } from './check_saved_objects_privileges';
import type { AuthorizationMode } from './mode';
/**
 * Authorization services available on the setup contract of the security plugin.
 */
export interface AuthorizationServiceSetup {
    /**
     * Actions are used to create the "actions" that are associated with Elasticsearch's
     * application privileges, and are used to perform the authorization checks implemented
     * by the various `checkPrivilegesWithRequest` derivatives.
     */
    actions: Actions;
    checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
    checkPrivilegesDynamicallyWithRequest: CheckPrivilegesDynamicallyWithRequest;
    checkSavedObjectsPrivilegesWithRequest: CheckSavedObjectsPrivilegesWithRequest;
    mode: AuthorizationMode;
}
