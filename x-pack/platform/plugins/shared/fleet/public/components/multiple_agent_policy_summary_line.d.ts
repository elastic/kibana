import React from 'react';
import type { AgentPolicy } from '../../common/types';
export declare const MultipleAgentPoliciesSummaryLine: React.NamedExoticComponent<{
    policies: AgentPolicy[];
    direction?: "column" | "row";
    packagePolicyId: string;
    onAgentPoliciesChange: () => void;
}>;
