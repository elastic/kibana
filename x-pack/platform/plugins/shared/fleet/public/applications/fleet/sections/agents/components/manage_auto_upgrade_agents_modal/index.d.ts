import React from 'react';
import type { AgentPolicy } from '../../../../../../../common';
export interface ManageAutoUpgradeAgentsModalProps {
    onClose: (refreshPolicy: boolean) => void;
    agentPolicy: AgentPolicy;
    agentCount?: number;
}
export declare const ManageAutoUpgradeAgentsModal: React.FunctionComponent<ManageAutoUpgradeAgentsModalProps>;
