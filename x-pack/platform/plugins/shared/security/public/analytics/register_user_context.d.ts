import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
/**
 * Set up the Analytics context provider for the User information.
 * @param analytics Core's Analytics service. The Setup contract.
 * @param authc {@link AuthenticationServiceSetup} used to get the current user's information
 * @param cloudId The Cloud Org ID.
 * @internal
 */
export declare function registerUserContext(analytics: AnalyticsServiceSetup, authc: AuthenticationServiceSetup, cloudId?: string): void;
