import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SuggestUserProfilesRequest } from '../../../common/types/api';
interface UserProfileOptions {
    securityPluginSetup: SecurityPluginSetup;
    securityPluginStart: SecurityPluginStart;
    spaces?: SpacesPluginStart;
    licensingPluginStart: LicensingPluginStart;
}
export declare class UserProfileService {
    private readonly logger;
    protected options?: UserProfileOptions;
    constructor(logger: Logger);
    initialize(options: UserProfileOptions): void;
    private static suggestUsers;
    suggest(request: KibanaRequest<{}, {}, SuggestUserProfilesRequest>): Promise<UserProfile[]>;
    private validateInitialization;
    private static validateSizeParam;
    private isSecurityEnabled;
    /**
     * This function constructs the privileges required for a user to be assigned to a case. We're requiring the ability
     * to read and update a case saved object. My thought process was that a user should at a minimum be able to read it
     * and change its status to close it. This is does not require that the user have access to comments or various other
     * privileges around the other entities within cases. If we move to a more granular object level permissions we'll
     * likely need to expand this to include the privileges for the other entities as well.
     */
    private static buildRequiredPrivileges;
}
export {};
