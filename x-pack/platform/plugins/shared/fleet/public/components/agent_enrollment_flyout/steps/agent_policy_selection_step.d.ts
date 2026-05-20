import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { AgentPolicy } from '../../../types';
export declare const AgentPolicySelectionStep: ({ agentPolicies, selectedPolicy, selectedPolicyId, setSelectedPolicyId, selectedApiKeyId, setSelectedAPIKeyId, excludeFleetServer, refreshAgentPolicies, }: {
    agentPolicies: AgentPolicy[];
    selectedPolicy?: AgentPolicy;
    selectedPolicyId?: string;
    setSelectedPolicyId: (agentPolicyId?: string) => void;
    selectedApiKeyId?: string;
    setSelectedAPIKeyId?: (key?: string) => void;
    excludeFleetServer?: boolean;
    refreshAgentPolicies: () => void;
}) => EuiContainedStepProps;
