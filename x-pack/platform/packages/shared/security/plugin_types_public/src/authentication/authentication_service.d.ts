import type { AuthenticatedUser } from '@kbn/core-security-common';
export interface AuthenticationServiceSetup {
    /**
     * Returns currently authenticated user and throws if current user isn't authenticated.
     */
    getCurrentUser: () => Promise<AuthenticatedUser>;
    /**
     * Determines if API Keys are currently enabled.
     */
    areAPIKeysEnabled: () => Promise<boolean>;
}
/**
 * Start has the same contract as Setup for now.
 */
export type AuthenticationServiceStart = AuthenticationServiceSetup;
