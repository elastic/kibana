import React from 'react';
import type { Agent } from '../../../../types';
interface Props {
    onClose: () => void;
    agents: Agent[] | string;
    agentCount: number;
}
export declare const AgentRequestDiagnosticsModal: React.FunctionComponent<Props>;
export {};
