import type { NewAgentPolicy, AgentPolicy } from '../../../types';
export interface ValidationResults {
    [key: string]: Array<JSX.Element | string>;
}
export declare const agentPolicyFormValidation: (agentPolicy: Partial<NewAgentPolicy | AgentPolicy>, options?: {
    allowedNamespacePrefixes?: string[];
}) => ValidationResults;
