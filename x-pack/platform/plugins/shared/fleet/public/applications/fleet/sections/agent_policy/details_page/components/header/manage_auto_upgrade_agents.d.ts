import React from 'react';
import type { AgentPolicy } from '../../../../../types';
export interface Props {
    agentPolicy: AgentPolicy;
    isManageAutoUpgradeAgentsModalOpen: boolean;
    setIsManageAutoUpgradeAgentsModalOpen: (isOpen: boolean) => void;
}
export declare const ManageAutoUpgradeAgentsBadge: React.FC<Props>;
