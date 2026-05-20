import React from 'react';
import type { Agent } from '../../../../../types';
interface Props {
    agents: Agent[] | string;
    agentCount: number;
    onClose: () => void;
    onSave: () => void;
    unsupportedMigrateAgents: Agent[];
}
export declare const AgentMigrateFlyout: React.FC<Props>;
export {};
