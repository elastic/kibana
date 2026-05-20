import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
import type { ValidationResults } from '../agent_policy_validation';
interface Props {
    agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
    allowedNamespacePrefixes?: string[];
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    validation: ValidationResults;
    setInvalidSpaceError?: (hasErrors: boolean) => void;
    disabled?: boolean;
}
export declare const AgentPolicyAdvancedOptionsContent: React.FunctionComponent<Props>;
export {};
