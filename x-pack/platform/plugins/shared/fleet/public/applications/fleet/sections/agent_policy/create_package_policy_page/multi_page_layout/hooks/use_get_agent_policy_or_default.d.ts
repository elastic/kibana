import type { AgentPolicy, EnrollmentAPIKey } from '../../../../../../../types';
export declare function useGetAgentPolicyOrDefault(agentPolicyIdIn?: string): {
    isLoading: boolean;
    error: Error | undefined;
    agentPolicy: AgentPolicy | undefined;
    enrollmentAPIKey: EnrollmentAPIKey | undefined;
    created: boolean | undefined;
};
