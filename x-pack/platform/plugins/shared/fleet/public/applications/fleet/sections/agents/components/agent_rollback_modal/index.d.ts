import React from 'react';
import type { Agent } from '../../../../types';
export interface AgentRollbackModalProps {
    agents: Agent[] | string;
    agentCount: number;
    onClose: () => void;
}
export declare const AgentRollbackModal: React.FunctionComponent<AgentRollbackModalProps>;
