import React from 'react';
import type { ActionStatus } from '../../../../../types';
export declare const ActivityItem: React.FunctionComponent<{
    action: ActionStatus;
    onClickViewAgents: (action: ActionStatus) => void;
    onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
}>;
