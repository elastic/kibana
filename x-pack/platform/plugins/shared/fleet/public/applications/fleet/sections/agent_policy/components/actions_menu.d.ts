import React from 'react';
import type { AgentPolicy } from '../../../types';
export declare const AgentPolicyActionMenu: React.NamedExoticComponent<{
    agentPolicy: AgentPolicy;
    onCopySuccess?: (newAgentPolicy: AgentPolicy) => void;
    fullButton?: boolean;
    enrollmentFlyoutOpenByDefault?: boolean;
    onCancelEnrollment?: () => void;
}>;
