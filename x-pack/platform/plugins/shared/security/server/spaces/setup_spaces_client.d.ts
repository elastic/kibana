import { type AuthenticatedUser, type KibanaRequest } from '@kbn/core/server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { AuditServiceSetup, AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
interface Deps {
    audit: AuditServiceSetup;
    authz: AuthorizationServiceSetup;
    spaces?: SpacesPluginSetup;
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
    getTypeRegistry: () => ISavedObjectTypeRegistry;
}
export declare const setupSpacesClient: ({ audit, authz, spaces, getCurrentUser, getTypeRegistry, }: Deps) => void;
export {};
