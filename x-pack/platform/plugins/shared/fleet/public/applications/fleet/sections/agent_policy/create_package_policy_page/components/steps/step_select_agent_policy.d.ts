import React from 'react';
import type { AgentPolicy, PackageInfo } from '../../../../../types';
export declare const StepSelectAgentPolicy: React.FunctionComponent<{
    packageInfo?: PackageInfo;
    agentPolicies: AgentPolicy[];
    updateAgentPolicies: (agentPolicies: AgentPolicy[]) => void;
    setHasAgentPolicyError: (hasError: boolean) => void;
    initialSelectedAgentPolicyIds: string[];
}>;
