import type { CoreSecurityDelegateContract } from '@kbn/core-security-browser';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import type { AuthenticationServiceSetup, UserProfileAPIClient } from '@kbn/security-plugin-types-public';
export declare const buildSecurityApi: ({ authc, }: {
    authc: AuthenticationServiceSetup;
}) => CoreSecurityDelegateContract;
export declare const buildUserProfileApi: ({ userProfile, }: {
    userProfile: UserProfileAPIClient;
}) => CoreUserProfileDelegateContract;
