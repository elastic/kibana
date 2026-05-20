import type { EuiComboBoxOptionOption, EuiSuperSelectOption } from '@elastic/eui';
import type { AgentPolicy, PackageInfo } from '../../../../../../../../../common';
export declare function useAgentPoliciesOptions(packageInfo?: PackageInfo): {
    agentPoliciesError: import("../../../../../../hooks").RequestError | null;
    isLoading: boolean;
    agentPolicyOptions: EuiSuperSelectOption<string>[];
    agentPolicies: AgentPolicy[];
    agentPolicyMultiOptions: EuiComboBoxOptionOption<string>[];
};
