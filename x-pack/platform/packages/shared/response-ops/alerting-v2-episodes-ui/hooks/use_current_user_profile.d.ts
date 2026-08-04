import type { CoreStart } from '@kbn/core/public';
export interface UseCurrentUserProfileOptions {
    userProfile: CoreStart['userProfile'];
}
/**
 * Fetches the current user's profile.
 *
 * The profile rarely changes within a session, so the result is cached
 * indefinitely (`staleTime: Infinity`). Returns `null` for anonymous users or
 * users authenticated via a proxy, who don't have a user profile.
 */
export declare const useCurrentUserProfile: ({ userProfile }: UseCurrentUserProfileOptions) => import("@tanstack/react-query").UseQueryResult<import("@kbn/security-plugin-types-public").GetUserProfileResponse<import("@kbn/core-user-profile-common").UserProfileData>, unknown>;
