import React from 'react';
import type { EuiStepProps } from '@elastic/eui';
import type { AgentPolicy, NewPackagePolicy } from '../../../../../../../common';
import type { PackageInfo } from '../../../../types';
interface Params {
    configureStep: React.ReactNode;
    packageInfo?: PackageInfo;
    existingAgentPolicies: AgentPolicy[];
    setHasAgentPolicyError: (hasError: boolean) => void;
    updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
    agentPolicies: AgentPolicy[];
    setAgentPolicies: (agentPolicies: AgentPolicy[]) => void;
    isLoadingData: boolean;
    packagePolicy: NewPackagePolicy;
    packagePolicyId: string;
    setNewAgentPolicyName: (newAgentPolicyName: string | undefined) => void;
}
export declare function usePackagePolicySteps({ configureStep, packageInfo, existingAgentPolicies, setHasAgentPolicyError, updatePackagePolicy, agentPolicies, setAgentPolicies, isLoadingData, packagePolicy, packagePolicyId, setNewAgentPolicyName, }: Params): {
    steps: EuiStepProps[];
    devToolsProps: {
        showDevtoolsRequest: boolean;
        devtoolRequest: string;
        devtoolRequestDescription: string;
    };
    createAgentPolicyIfNeeded: () => Promise<string | undefined>;
};
export {};
