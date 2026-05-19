import type { UseQueryResult } from '@kbn/react-query';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { ServerError } from '../../types';
import type { SuggestUserProfilesArgs } from './api';
type Props = Omit<SuggestUserProfilesArgs, 'signal' | 'http'> & {
    onDebounce?: () => void;
};
export declare const useSuggestUserProfiles: ({ name, owners, size, onDebounce, }: Props) => UseQueryResult<UserProfile<import("@kbn/security-plugin/common").UserProfileData>[], ServerError>;
export type UseSuggestUserProfiles = UseQueryResult<UserProfile[], ServerError>;
export {};
