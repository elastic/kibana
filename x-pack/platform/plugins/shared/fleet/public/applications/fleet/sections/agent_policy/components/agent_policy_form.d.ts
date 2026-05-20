import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../../types';
import type { ValidationResults } from './agent_policy_validation';
interface Props {
    agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    withSysMonitoring: boolean;
    updateSysMonitoring: (newValue: boolean) => void;
    validation: ValidationResults;
    isEditing?: boolean;
    updateAdvancedSettingsHasErrors: (hasErrors: boolean) => void;
    setInvalidSpaceError: (hasErrors: boolean) => void;
}
export declare const useAgentPolicyFormContext: () => {
    agentPolicy: Partial<NewAgentPolicy | AgentPolicy> & {
        [key: string]: any;
    };
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    updateAdvancedSettingsHasErrors: (hasErrors: boolean) => void;
    setInvalidSpaceError: (hasErrors: boolean) => void;
} | undefined;
export declare const AgentPolicyForm: React.FunctionComponent<Props>;
export {};
