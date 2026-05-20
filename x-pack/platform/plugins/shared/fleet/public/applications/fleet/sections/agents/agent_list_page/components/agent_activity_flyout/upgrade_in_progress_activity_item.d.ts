import React from 'react';
import type { ActionStatus } from '../../../../../types';
export declare const UpgradeInProgressActivityItem: React.FunctionComponent<{
    action: ActionStatus;
    abortUpgrade: (action: ActionStatus) => Promise<void>;
    onClickViewAgents: (action: ActionStatus) => void;
    onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
}>;
