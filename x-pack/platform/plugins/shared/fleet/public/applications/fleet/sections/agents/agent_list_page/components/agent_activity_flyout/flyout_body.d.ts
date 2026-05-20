import React from 'react';
import type { ActionStatus } from '../../../../../types';
export declare const FlyoutBody: React.FunctionComponent<{
    isFirstLoading: boolean;
    currentActions: ActionStatus[];
    abortUpgrade: (action: ActionStatus) => Promise<void>;
    onClickViewAgents: (action: ActionStatus) => Promise<void>;
    onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
    areActionsFullyLoaded: boolean;
    onClickShowMore: () => void;
    dateFilter: moment.Moment | null;
    onChangeDateFilter: (date: moment.Moment | null) => void;
}>;
