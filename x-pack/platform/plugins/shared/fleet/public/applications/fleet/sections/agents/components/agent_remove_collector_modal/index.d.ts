import React from 'react';
import type { Agent } from '../../../../types';
interface Props {
    onClose: () => void;
    agents: Agent[] | string;
    agentCount: number;
}
export declare const AgentRemoveCollectorModal: React.FunctionComponent<Props>;
export {};
