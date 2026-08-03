import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { UserProfileServiceStart } from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { UserProfileGrant } from './user_profile_grant';
import type { SecurityLicense, UserProfileData, UserProfileWithSecurity } from '../../common';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import { type Session } from '../session_management';
export interface UserProfileServiceStartInternal extends UserProfileServiceStart {
    /**
     * Activates user profile using provided user profile grant.
     * @param grant User profile grant (username/password or access token).
     */
    activate(grant: UserProfileGrant): Promise<UserProfileWithSecurity>;
    /**
     * Updates user preferences by identifier.
     * @param uid User ID
     * @param data Application data to be written (merged with existing data).
     */
    update<D extends UserProfileData>(uid: string, data: D): Promise<void>;
}
export interface UserProfileServiceSetupParams {
    authz: AuthorizationServiceSetupInternal;
    license: SecurityLicense;
}
export interface UserProfileServiceStartParams {
    clusterClient: IClusterClient;
    session: PublicMethodsOf<Session>;
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}
export declare class UserProfileService {
    private readonly logger;
    private authz?;
    private license?;
    constructor(logger: Logger);
    setup({ authz, license }: UserProfileServiceSetupParams): void;
    start({ clusterClient, session, getCurrentUser }: UserProfileServiceStartParams): UserProfileServiceStartInternal;
    /**
     * See {@link UserProfileServiceStartInternal} for documentation.
     */
    private activate;
    /**
     * Determines the type of authorization from the Authorization header.
     * @param authHeader The Authorization header value
     * @returns The type of authorization ('basic', 'apikey', or null if neither)
     */
    private getAuthHeaderType;
    /**
     * Retrieves the current user profile ID from a session-authenticated request.
     * @param session Session service instance
     * @param request The HTTP request
     * @returns The profile ID if found, null otherwise
     */
    private getCurrentUserProfileIdViaSession;
    /**
     * Activates the user profile from a Basic auth authenticated request.
     * @param clusterClient The cluster client
     * @param request The HTTP request
     * @returns The activated profile
     */
    private activateProfileViaBasicAuth;
    /**
     * Retrieves the user profile ID from an API key authenticated request by retrieving the API Key itself.
     * @param clusterClient The cluster client
     * @param request The HTTP request
     * @returns The profile ID if found, undefined otherwise
     */
    private getCurrentUserProfileIdViaApiKey;
    private recordGetCurrentSuccess;
    private recordGetCurrentFailure;
    private recordGetCurrentProfileIdSuccess;
    private recordGetCurrentProfileIdFailure;
    /**
     * Resolves the profile identifier of the current user extracted from the specified request, without fetching the
     * full user profile document from Elasticsearch. Shared by {@link getCurrent} and {@link getCurrentProfileId}.
     * @param clusterClient The cluster client
     * @param session Session service instance
     * @param getCurrentUser Function that returns the `AuthenticatedUser` bound to the request, if any
     * @param request The HTTP request
     * @param recordFailure Callback used to record the caller's own failure telemetry. Only invoked when the Basic
     * auth activation step throws, since that's the one path that can fail before a `profileId` is determined.
     */
    private resolveCurrentUserProfileId;
    /**
     * See {@link UserProfileServiceStart} for documentation.
     */
    private getCurrent;
    /**
     * See {@link UserProfileServiceStart} for documentation.
     */
    private getCurrentProfileId;
    /**
     * See {@link UserProfileServiceStart} for documentation.
     */
    private bulkGet;
    /**
     * See {@link UserProfileServiceStartInternal} for documentation.
     */
    private update;
    /**
     * See {@link UserProfileServiceStart} for documentation.
     */
    private suggest;
    private filterProfilesByPrivileges;
}
/**
 * Returns string of comma separated values prefixed with `prefix`.
 * @param str String of comma separated values
 * @param prefix Prefix to use prepend to each value
 */
export declare function prefixCommaSeparatedValues(str: string, prefix: string): string;
