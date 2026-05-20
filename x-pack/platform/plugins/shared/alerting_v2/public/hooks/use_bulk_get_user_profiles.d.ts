import type { UserProfile } from '@kbn/core-user-profile-common';
export type UserProfileMap = Map<string, UserProfile>;
export declare const useBulkGetUserProfiles: ({ uids }: {
    uids: string[];
}) => import("@kbn/react-query").UseQueryResult<UserProfileMap, unknown>;
