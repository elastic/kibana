import React from 'react';
import type { Agent } from '../../../../../types';
interface Props {
    agents: Agent[] | string;
    agentCount: number;
    unsupportedAgents: Agent[];
    onClose: () => void;
    onSave: () => void;
}
export declare const ChangeAgentPrivilegeLevelFlyout: React.FC<Props>;
export {};
