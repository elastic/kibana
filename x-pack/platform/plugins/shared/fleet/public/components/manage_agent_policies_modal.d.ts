import React from 'react';
import type { AgentPolicy } from '../types';
interface Props {
    onClose: () => void;
    selectedAgentPolicies: AgentPolicy[];
    packagePolicyId: string;
    onAgentPoliciesChange: () => void;
}
export declare const ManageAgentPoliciesModal: React.FunctionComponent<Props>;
export {};
