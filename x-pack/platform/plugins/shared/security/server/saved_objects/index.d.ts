import type { AuthenticatedUser, CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import { SavedObjectsSecurityExtension } from './saved_objects_security_extension';
import type { AuthorizationServiceSetupInternal } from '../authorization';
export { SecurityAction } from './types';
interface SetupSavedObjectsParams {
    audit: AuditServiceSetup;
    authz: Pick<AuthorizationServiceSetupInternal, 'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'>;
    savedObjects: CoreSetup['savedObjects'];
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}
export declare function setupSavedObjects({ audit, authz, savedObjects, getCurrentUser, }: SetupSavedObjectsParams): void;
export { SavedObjectsSecurityExtension };
