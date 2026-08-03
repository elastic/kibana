import type { Capabilities } from '@kbn/core/types';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
export declare function canUserChangePassword(user: Pick<AuthenticatedUser, 'authentication_realm' | 'authentication_provider'>): boolean;
export declare function canUserChangeDetails(user: Pick<AuthenticatedUser, 'authentication_realm'>, capabilities: Capabilities): boolean;
