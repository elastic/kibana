import type { UserProfile } from '@kbn/user-profile-components';
import type { User } from '../../../common/types/domain';
import type { AuthenticatedElasticUser } from '../../common/lib/kibana';
import type { FilterMode as RecentCasesFilterMode } from './types';
export interface ReporterFilter {
    currentUserProfile?: UserProfile;
    currentUser: Partial<AuthenticatedElasticUser> | null;
    isLoadingCurrentUserProfile: boolean;
    recentCasesFilterBy: RecentCasesFilterMode;
}
export interface AssigneeFilter {
    currentUserProfile?: UserProfile;
    isLoadingCurrentUserProfile: boolean;
}
export declare const getReporterFilter: ({ currentUserProfile, currentUser, isLoadingCurrentUserProfile, recentCasesFilterBy, }: ReporterFilter) => {
    reporters: User[];
};
export declare const getAssigneeFilter: ({ currentUserProfile, isLoadingCurrentUserProfile, }: AssigneeFilter) => {
    assignees: string[];
};
