import type { UseQueryResult } from '@kbn/react-query';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { ServerError } from '../../types';
export declare const useGetCurrentUserProfile: () => UseQueryResult<UserProfile<import("@kbn/security-plugin/common").UserProfileData>, ServerError>;
export type UseGetCurrentUserProfile = UseQueryResult<UserProfile, ServerError>;
