import React from 'react';
import type { Agent } from '../../../../types';
interface Props {
    onClose: () => void;
    agents: Agent[] | string;
}
export declare const AgentReassignAgentPolicyModal: React.FunctionComponent<Props>;
export {};
