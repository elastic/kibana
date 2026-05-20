import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React from 'react';
import type { AgentPolicy, PackageInfo } from '../../../../../../../../../common';
export interface Props {
    isLoading: boolean;
    agentPolicyMultiOptions: Array<EuiComboBoxOptionOption<string>>;
    selectedPolicyIds: string[];
    setSelectedPolicyIds: (policyIds: string[]) => void;
    packageInfo?: PackageInfo;
    selectedAgentPolicies: AgentPolicy[];
}
export declare const AgentPolicyMultiSelect: React.FunctionComponent<Props>;
