import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { UserWithProfileInfo } from '../../../common/types/domain';
export interface Assignee {
    uid: string;
    profile?: UserProfileWithAvatar;
}
export interface AssigneeWithProfile extends Assignee {
    profile: UserProfileWithAvatar;
}
export type UserInfoWithAvatar = Partial<Pick<UserProfileWithAvatar, 'user' | 'data'>>;
export type AssigneesFilteringSelection = UserProfileWithAvatar | null;
export type CaseUserWithProfileInfo = UserWithProfileInfo;
