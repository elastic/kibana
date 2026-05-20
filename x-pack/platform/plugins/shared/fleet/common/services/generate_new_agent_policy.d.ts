import type { AgentPolicy, NewAgentPolicy } from '../types';
export declare function generateNewAgentPolicyWithDefaults(overrideProps?: Partial<NewAgentPolicy>): NewAgentPolicy;
export declare function agentPolicyWithoutPaidFeatures(agentPolicy: Partial<AgentPolicy>): Partial<AgentPolicy>;
