import React from 'react';
import type { AgentPolicy } from '../../../../../../types';
export declare const PackagePolicyAgentsCell: ({ agentPolicies, onAddAgent, hasHelpPopover, }: {
    agentPolicies: AgentPolicy[];
    hasHelpPopover?: boolean;
    onAddAgent: () => void;
}) => React.JSX.Element;
export declare const AgentsCountBreakDown: ({ agentPolicies, agentCount, privilegeMode, }: {
    agentPolicies: AgentPolicy[];
    agentCount: number;
    privilegeMode?: "privileged" | "unprivileged";
}) => React.JSX.Element;
