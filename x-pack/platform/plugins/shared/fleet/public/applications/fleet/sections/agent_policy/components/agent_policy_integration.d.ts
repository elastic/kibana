import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../../types';
import type { ValidationResults } from './agent_policy_validation';
interface Props {
    agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    withSysMonitoring: boolean;
    updateSysMonitoring: (newValue: boolean) => void;
    validation: ValidationResults;
}
export declare const AgentPolicyIntegrationForm: React.FunctionComponent<Props>;
export {};
