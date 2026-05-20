import type { UseQueryResult } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ServerError } from '../../types';
export declare const useBulkGetUserProfiles: ({ uids }: {
    uids: string[];
}) => UseQueryResult<Map<string, UserProfileWithAvatar>, ServerError>;
export type UseBulkGetUserProfiles = UseQueryResult<Map<string, UserProfileWithAvatar>, ServerError>;
