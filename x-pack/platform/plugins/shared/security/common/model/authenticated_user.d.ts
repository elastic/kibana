import type { Capabilities } from '@kbn/core/types';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
export declare function isUserAnonymous(user: Pick<AuthenticatedUser, 'authentication_provider'>): boolean;
/**
 * All users are supposed to have profiles except anonymous users and users authenticated
 * via authentication HTTP proxies.
 * @param user Authenticated user information.
 */
export declare function canUserHaveProfile(user: AuthenticatedUser): boolean;
export declare function canUserChangePassword(user: Pick<AuthenticatedUser, 'authentication_realm' | 'authentication_provider'>): boolean;
export declare function canUserChangeDetails(user: Pick<AuthenticatedUser, 'authentication_realm'>, capabilities: Capabilities): boolean;
