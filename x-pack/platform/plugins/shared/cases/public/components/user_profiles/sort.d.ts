import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CurrentUserProfile } from '../types';
import type { AssigneesFilteringSelection, UserInfoWithAvatar } from './types';
export declare const getSortField: (profile: UserProfileWithAvatar | UserInfoWithAvatar) => string;
export declare const moveCurrentUserToBeginning: <T extends {
    uid: string;
}>(currentUserProfile?: T, profiles?: T[]) => T[] | undefined;
export declare const bringCurrentUserToFrontAndSort: (currentUserProfile: CurrentUserProfile, profiles?: UserProfileWithAvatar[]) => UserProfileWithAvatar[] | undefined;
export declare const sortProfiles: (profiles?: UserProfileWithAvatar[]) => UserProfileWithAvatar[] | undefined;
export declare const orderAssigneesIncludingNone: (currentUserProfile: CurrentUserProfile, assignees: AssigneesFilteringSelection[]) => (UserProfileWithAvatar | null)[];
