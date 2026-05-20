import React from 'react';
import type { Agent } from '../../../../types';
export interface AgentUpgradeAgentModalProps {
    onClose: () => void;
    agents: Agent[] | string;
    agentCount: number;
    isScheduled?: boolean;
    isUpdating?: boolean;
}
export declare const AgentUpgradeAgentModal: React.FunctionComponent<AgentUpgradeAgentModalProps>;
export declare const UpgradeModalWarningCallout: React.FunctionComponent<{
    warningMessage: string;
}>;
