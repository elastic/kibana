import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { Assignee } from '../../../../../user_profiles/types';
import type { CurrentUserProfile } from '../../../../../types';
export interface UseAssigneesPickerArgs {
    allAssignees: Assignee[];
    assigneesWithoutProfiles: Assignee[];
    currentUserProfile: CurrentUserProfile;
    onAssigneesChanged: (assignees: Assignee[]) => void;
}
export interface UseAssigneesPickerResult {
    isPopoverOpen: boolean;
    togglePopover: () => void;
    openPopover: () => void;
    onClosePopover: () => void;
    onUsersChange: (users: UserProfileWithAvatar[]) => void;
    assignSelf: () => void;
}
export declare const useAssigneesPicker: ({ allAssignees, assigneesWithoutProfiles, currentUserProfile, onAssigneesChanged, }: UseAssigneesPickerArgs) => UseAssigneesPickerResult;
