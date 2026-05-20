import React from 'react';
import type { AgentPolicy, Agent } from '../../common/types';
export declare const AgentPolicySummaryLine: React.NamedExoticComponent<{
    policy: AgentPolicy;
    agent?: Agent;
    direction?: "column" | "row";
    withDescription?: boolean;
    /** When true (e.g. in agent list/details), show policy id in parentheses: "Policy Name (policy_id)" */
    showPolicyId?: boolean;
    isVersionSpecific?: boolean;
}>;
