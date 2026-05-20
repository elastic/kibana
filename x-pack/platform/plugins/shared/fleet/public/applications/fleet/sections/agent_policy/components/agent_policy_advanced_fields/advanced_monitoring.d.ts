import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
import type { ValidationResults } from '../agent_policy_validation';
export declare const AgentPolicyAdvancedMonitoringOptions: React.FunctionComponent<{
    agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
    disabled: boolean;
    validation: ValidationResults;
    touchedFields: {
        [key: string]: boolean;
    };
    updateTouchedFields: (fields: {
        [key: string]: boolean;
    }) => void;
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
}>;
