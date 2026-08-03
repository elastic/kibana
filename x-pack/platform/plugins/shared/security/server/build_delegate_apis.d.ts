import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import type { Logger } from '@kbn/logging';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { InternalAuthenticationServiceStart } from './authentication';
import type { Session } from './session_management';
import type { UserProfileServiceStartInternal } from './user_profile';
export declare const buildSecurityApi: ({ getAuthc, getSession, audit, config, logger, }: {
    getAuthc: () => InternalAuthenticationServiceStart;
    getSession: () => Pick<Session, "getSID">;
    audit: AuditServiceSetup;
    config: {
        uiam?: {
            enabled: boolean;
        };
    };
    logger: Logger;
}) => CoreSecurityDelegateContract;
export declare const buildUserProfileApi: ({ getUserProfile, }: {
    getUserProfile: () => UserProfileServiceStartInternal;
}) => CoreUserProfileDelegateContract;
