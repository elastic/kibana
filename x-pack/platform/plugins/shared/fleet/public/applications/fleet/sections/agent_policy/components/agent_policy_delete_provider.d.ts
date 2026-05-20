import React from 'react';
import type { AgentPolicy, PackagePolicy } from '../../../types';
interface Props {
    children: (deleteAgentPolicy: DeleteAgentPolicy) => React.ReactElement;
    hasFleetServer: boolean;
    packagePolicies?: PackagePolicy[];
    agentPolicy: AgentPolicy;
}
export type DeleteAgentPolicy = (agentPolicy: string, onSuccess?: OnSuccessCallback) => void;
type OnSuccessCallback = (agentPolicyDeleted: string) => void;
export declare const AgentPolicyDeleteProvider: React.FunctionComponent<Props>;
export {};
