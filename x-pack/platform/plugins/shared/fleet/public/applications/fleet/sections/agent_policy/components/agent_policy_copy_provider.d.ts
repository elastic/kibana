import React from 'react';
import type { AgentPolicy } from '../../../types';
interface Props {
    children: (copyAgentPolicy: CopyAgentPolicy) => React.ReactElement;
}
export type CopyAgentPolicy = (agentPolicy: AgentPolicy, onSuccess?: OnSuccessCallback) => void;
type OnSuccessCallback = (newAgentPolicy: AgentPolicy) => void;
export declare const AgentPolicyCopyProvider: React.FunctionComponent<Props>;
export {};
