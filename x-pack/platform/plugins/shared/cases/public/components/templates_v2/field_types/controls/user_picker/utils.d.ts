import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
export interface SelectedUser {
    uid: string;
    name: string;
}
export type UserProfileOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;
export declare const toSelectedUsers: (value: unknown) => SelectedUser[];
export declare const profileToOption: (profile: UserProfileWithAvatar) => UserProfileOption;
