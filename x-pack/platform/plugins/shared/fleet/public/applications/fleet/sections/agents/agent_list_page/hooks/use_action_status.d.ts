import type { ActionStatus } from '../../../../types';
export declare function useActionStatus(onAbortSuccess: () => void, refreshAgentActivity: boolean, nActions: number, dateFilter: moment.Moment | null): {
    currentActions: ActionStatus[];
    abortUpgrade: (action: ActionStatus) => Promise<void>;
    isFirstLoading: boolean;
    areActionsFullyLoaded: boolean;
};
