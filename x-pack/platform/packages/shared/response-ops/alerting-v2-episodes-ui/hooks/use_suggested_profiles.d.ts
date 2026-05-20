import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
export interface UseSuggestedProfilesParams {
    userProfile: UserProfileService;
    /** Search string; the query runs only when the trimmed value is non-empty. */
    searchTerm: string;
    toasts: {
        addError: (error: Error, options: {
            title: string;
        }) => void;
    };
    errorTitle: string;
}
/**
 * Suggests user profiles via UserProfileService.suggest with shared caching and error handling.
 */
export declare function useSuggestedProfiles({ userProfile, searchTerm, toasts, errorTitle, }: UseSuggestedProfilesParams): import("@kbn/react-query").UseQueryResult<UserProfileWithAvatar[], unknown>;
