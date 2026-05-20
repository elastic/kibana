import type { KibanaRequest } from '@kbn/core/server';
import type { NativeAPIKeysType } from '@kbn/core-security-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
/**
 * Authentication services available on the security plugin's start contract.
 */
export interface AuthenticationServiceStart {
    apiKeys: NativeAPIKeysType;
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}
