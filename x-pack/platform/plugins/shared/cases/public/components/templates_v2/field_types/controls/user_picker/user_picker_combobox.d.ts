import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { SelectedUser } from './utils';
export interface UserPickerComboboxProps {
    label?: string;
    name: string;
    isInvalid: boolean;
    errorMessage: string | null;
    isLoading: boolean;
    isLoadingBulk: boolean;
    isMultiple: boolean;
    isRequired: boolean;
    selectedUsers: SelectedUser[];
    allKnownProfiles: UserProfileWithAvatar[];
    onChange: (next: SelectedUser[]) => void;
    onSearchChange: (value: string) => void;
}
export declare const UserPickerCombobox: React.FC<UserPickerComboboxProps>;
