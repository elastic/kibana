import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
export declare const useSuggestUsers: (searchTerm: string, { enabled }?: {
    enabled?: boolean;
}) => import("@tanstack/react-query").UseQueryResult<UserProfileWithAvatar[], unknown>;
