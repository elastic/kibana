import React from 'react';
import type { AgentPolicy } from '../../../types';
export declare const ConfirmDeployAgentPolicyModal: React.FunctionComponent<{
    onConfirm: () => void;
    onCancel: () => void;
    agentCount: number;
    agentPolicies: AgentPolicy[];
    agentPoliciesToAdd?: string[];
    agentPoliciesToRemove?: string[];
}>;
