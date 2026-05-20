import type { UserProfileService } from '@kbn/core-user-profile-browser';
export declare const getKey: () => readonly ["reporting", "userProfile"];
export declare const useGetUserProfileQuery: ({ userProfileService, }: {
    userProfileService?: UserProfileService;
}) => import("@kbn/react-query").UseQueryResult<import("@kbn/core-user-profile-browser").GetUserProfileResponse<import("@kbn/security-plugin-types-common").UserProfileData>, unknown>;
