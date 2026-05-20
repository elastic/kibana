import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../types';
interface Props {
    agentPolicy: Partial<AgentPolicy | NewAgentPolicy>;
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    isDisabled?: boolean;
}
export declare const AgentPolicyCustomFields: React.FunctionComponent<Props>;
export {};
