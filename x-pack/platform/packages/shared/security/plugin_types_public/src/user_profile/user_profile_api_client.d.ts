import type { Observable } from 'rxjs';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
export type { GetUserProfileResponse, UserProfileSuggestParams, UserProfileBulkGetParams, UserProfileGetCurrentParams, } from '@kbn/core-user-profile-browser';
export type UserProfileAPIClient = CoreUserProfileDelegateContract & {
    /**
     * Indicates if the user profile data has been loaded from the server.
     * Useful to distinguish between the case when the user profile data is `null` because the HTTP
     * request has not finished or because there is no user profile data for the current user.
     */
    readonly userProfileLoaded$: Observable<boolean>;
};
