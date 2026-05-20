import React from 'react';
import type { AgentPolicy } from '../../../../../../../../common';
export interface Props {
    selectedAgentPolicies: string[];
    onSelectedAgentPoliciesChange: (selectedPolicies: string[]) => void;
    agentPolicies: AgentPolicy[];
}
export declare const AgentPolicyFilter: React.FunctionComponent<Props>;
