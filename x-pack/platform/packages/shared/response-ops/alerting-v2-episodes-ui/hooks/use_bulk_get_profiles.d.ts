import type { UserProfileService } from '@kbn/core-user-profile-browser';
export interface UseBulkGetProfilesParams {
    userProfile: UserProfileService;
    /** Profile UIDs to fetch; the query stays idle when this list is empty. */
    uids: readonly string[];
    toasts: {
        addError: (error: Error, options: {
            title: string;
        }) => void;
    };
    errorTitle: string;
}
/**
 * Fetches user profiles via UserProfileService.bulkGet with shared caching and error handling.
 */
export declare function useBulkGetProfiles({ userProfile, uids, toasts, errorTitle, }: UseBulkGetProfilesParams): import("@tanstack/react-query").UseQueryResult<import("@kbn/core-user-profile-common").UserProfile<import("@kbn/core-user-profile-common").UserProfileData>[], unknown>;
