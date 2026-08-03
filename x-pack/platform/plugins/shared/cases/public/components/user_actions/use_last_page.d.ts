import type { CaseUserActionsStats } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
export declare const useLastPage: ({ userActivityQueryParams, userActionsStats, }: {
    userActivityQueryParams: UserActivityParams;
    userActionsStats: CaseUserActionsStats;
}) => {
    lastPage: number;
};
