import type { Observable } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { UserProfileAPIClient as UserProfileAPIClientType, UserProfileBulkGetParams, UserProfileGetCurrentParams, UserProfileSuggestParams } from '@kbn/security-plugin-types-public';
import type { UserProfileData } from '@kbn/user-profile-components';
import type { GetUserProfileResponse, UserProfile } from '../../../common';
export declare class UserProfileAPIClient implements UserProfileAPIClientType {
    private readonly http;
    private readonly internalDataUpdates$;
    /**
     * Emits event whenever user profile is changed by the user.
     */
    readonly dataUpdates$: Observable<UserProfileData>;
    private readonly _userProfile$;
    private readonly _enabled$;
    private readonly _userProfileLoaded$;
    /** Observable of the current user profile data */
    readonly userProfile$: Observable<UserProfileData | null>;
    readonly userProfileLoaded$: Observable<boolean>;
    enabled$: Observable<boolean>;
    constructor(http: HttpStart);
    start(): void;
    /**
     * Retrieves the user profile of the current user. If the profile isn't available, e.g. for the anonymous users or
     * users authenticated via authenticating proxies, the `null` value is returned.
     * @param [params] Get current user profile operation parameters.
     * @param params.dataPath By default `getCurrent()` returns user information, but does not return any user data. The
     * optional "dataPath" parameter can be used to return personal data for this user.
     */
    getCurrent<D extends UserProfileData>(params?: UserProfileGetCurrentParams): Promise<GetUserProfileResponse<D>>;
    /**
     * Retrieves multiple user profiles by their identifiers.
     * @param params Bulk get operation parameters.
     * @param params.uids List of user profile identifiers.
     * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
     * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
     */
    bulkGet<D extends UserProfileData>(params: UserProfileBulkGetParams): Promise<UserProfile<D>[]>;
    /**
     * Suggests multiple user profiles by search criteria.
     *
     * Note: This endpoint is not provided out-of-the-box by the platform. You need to expose your own
     * version within your app. An example of how to do this can be found in:
     * `examples/user_profile_examples/server/plugin.ts`
     *
     * @param path Path to your app's suggest endpoint.
     * @param params Suggest operation parameters.
     * @param params.name Query string used to match name-related fields in user profiles. The
     * following fields are treated as name-related: username, full_name and email.
     * @param params.size Desired number of suggestions to return. The default value is 10.
     * @param params.dataPath By default, suggest API returns user information, but does not return
     * any user data. The optional "dataPath" parameter can be used to return personal data for this
     * user (within `kibana` namespace only).
     */
    suggest<D extends UserProfileData>(path: string, params: UserProfileSuggestParams): Promise<UserProfile<D>[]>;
    /**
     * Updates user profile data of the current user.
     * @param data Application data to be written (merged with existing data).
     */
    update<D extends UserProfileData>(data: D): Promise<void>;
    /**
     * Updates user profile data of the current user.
     * @param data Application data to be written (merged with existing data).
     */
    partialUpdate<D extends Partial<UserProfileData>>(data: D): Promise<void>;
}
