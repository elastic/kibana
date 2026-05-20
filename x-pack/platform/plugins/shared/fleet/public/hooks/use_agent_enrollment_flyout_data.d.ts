import type { AgentPolicy } from '../types';
interface AgentEnrollmentFlyoutData {
    agentPolicies: AgentPolicy[];
    refreshAgentPolicies: () => void;
    isLoadingInitialAgentPolicies: boolean;
    isLoadingAgentPolicies: boolean;
}
export declare function useAgentEnrollmentFlyoutData(): AgentEnrollmentFlyoutData;
export {};
