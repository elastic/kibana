import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseAssignees } from '../../../common/types/domain';
import type { Assignee, AssigneeWithProfile } from '../../components/user_profiles/types';
export declare const useAssignees: ({ caseAssignees, userProfiles, }: {
    caseAssignees: CaseAssignees;
    userProfiles: Map<string, UserProfileWithAvatar>;
}) => {
    assigneesWithProfiles: AssigneeWithProfile[];
    assigneesWithoutProfiles: Assignee[];
    allAssignees: Assignee[];
};
