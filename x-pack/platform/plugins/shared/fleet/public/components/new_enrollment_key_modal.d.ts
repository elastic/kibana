import React from 'react';
import type { AgentPolicy, EnrollmentAPIKey } from '../types';
interface Props {
    onClose: (key?: EnrollmentAPIKey) => void;
    agentPolicies?: AgentPolicy[];
}
export declare const NewEnrollmentTokenModal: React.FunctionComponent<Props>;
export {};
