import React from 'react';
import type { AgentPolicy } from '../../../types';
interface Props {
    updateAgentPolicy: (u: AgentPolicy | null, errorMessage?: JSX.Element) => void;
    isFleetServerPolicy?: boolean;
    agentPolicyName: string;
}
export declare const AgentPolicyCreateInlineForm: React.FunctionComponent<Props>;
export {};
