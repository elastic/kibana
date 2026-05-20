import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AssigneeWithProfile } from '../../user_profiles/types';
import type { CurrentUserProfile } from '../../types';
export interface SuggestUsersPopoverProps {
    assignedUsersWithProfiles: AssigneeWithProfile[];
    currentUserProfile: CurrentUserProfile;
    isLoading: boolean;
    isPopoverOpen: boolean;
    onUsersChange: (users: UserProfileWithAvatar[]) => void;
    togglePopover: () => void;
    onClosePopover: () => void;
}
export declare const SuggestUsersPopover: React.NamedExoticComponent<SuggestUsersPopoverProps>;
