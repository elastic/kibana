import React from 'react';
import type { Agent } from '../../../../types';
interface Props {
    onClose: () => void;
    agents: Agent[] | string;
    agentCount: number;
    useForceUnenroll?: boolean;
    hasFleetServer?: boolean;
}
export declare const AgentUnenrollAgentModal: React.FunctionComponent<Props>;
export {};
