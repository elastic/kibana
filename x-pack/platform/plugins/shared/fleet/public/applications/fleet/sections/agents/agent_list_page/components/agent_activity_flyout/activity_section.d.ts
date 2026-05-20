import type { ReactNode } from 'react';
import React from 'react';
import type { ActionStatus } from '../../../../../types';
export declare const ActivitySection: React.FunctionComponent<{
    title: ReactNode;
    actions: ActionStatus[];
    abortUpgrade: (action: ActionStatus) => Promise<void>;
    onClickViewAgents: (action: ActionStatus) => void;
    onClickManageAutoUpgradeAgents: (action: ActionStatus) => void;
}>;
