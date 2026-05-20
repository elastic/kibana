import type { AgentPolicy } from '../../types';
import type { FullAgentPolicy } from '../../../common';
import type { K8sMode, CloudSecurityIntegration } from './types';
export declare function useAgentPolicyWithPackagePolicies(policyId?: string): {
    agentPolicyWithPackagePolicies: AgentPolicy | null;
};
export declare function useIsK8sPolicy(agentPolicy?: AgentPolicy): {
    isK8s: K8sMode;
};
export declare function useCloudSecurityIntegration(agentPolicy?: AgentPolicy): {
    cloudSecurityIntegration: CloudSecurityIntegration | undefined;
};
export declare function useGetCreateApiKey(): {
    apiKey: string | undefined;
    apiKeyEncoded: string | undefined;
    isLoading: boolean;
    onCreateApiKey: () => Promise<void>;
};
export declare function useFetchFullPolicy(agentPolicy: AgentPolicy | undefined, isK8s?: K8sMode): {
    yaml: any;
    onCreateApiKey: () => Promise<void>;
    fullAgentPolicy: FullAgentPolicy | undefined;
    isCreatingApiKey: boolean;
    apiKey: string | undefined;
    downloadYaml: () => void;
};
