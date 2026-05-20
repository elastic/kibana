import type { ReactElement } from 'react';
import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../../types';
import type { ValidationResults } from './agent_policy_validation';
interface Props {
    agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    validation: ValidationResults;
    nameLabel?: ReactElement<any, any>;
    disabled?: boolean;
}
export declare const AgentPolicyGeneralFields: React.FunctionComponent<Props>;
export {};
