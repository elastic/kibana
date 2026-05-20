import React from 'react';
import { type AgentPolicy, type NewPackagePolicy, type NewAgentPolicy, type PackagePolicy, type PackageInfo, SetupTechnology } from '../../../../../types';
import type { PackagePolicyValidationResults } from '../../services';
import type { PackagePolicyFormState } from '../../types';
import type { RegistryVarGroup } from '../../../../../types';
import { SelectedPolicyTab } from '../../components';
export declare function createAgentPolicy({ packagePolicy, newAgentPolicy, withSysMonitoring, }: {
    packagePolicy: NewPackagePolicy;
    newAgentPolicy: NewAgentPolicy;
    withSysMonitoring: boolean;
}): Promise<AgentPolicy>;
export declare const createAgentPolicyIfNeeded: ({ selectedPolicyTab, withSysMonitoring, newAgentPolicy, packagePolicy, packageInfo, }: {
    selectedPolicyTab: SelectedPolicyTab;
    withSysMonitoring: boolean;
    newAgentPolicy: NewAgentPolicy;
    packagePolicy: NewPackagePolicy;
    packageInfo?: PackageInfo;
}) => Promise<AgentPolicy | undefined>;
export declare const updateAgentlessCloudConnectorConfig: (packagePolicy: NewPackagePolicy, newAgentPolicy: NewAgentPolicy, setNewAgentPolicy: (policy: NewAgentPolicy) => void, setPackagePolicy: (policy: NewPackagePolicy) => void, varGroups?: RegistryVarGroup[]) => void;
export declare function useOnSubmit({ agentCount, selectedPolicyTab, newAgentPolicy, withSysMonitoring, queryParamsPolicyId, packageInfo, integrationToEnable, hasFleetAddAgentsPrivileges, setNewAgentPolicy, setSelectedPolicyTab, isAddIntegrationFlyout, defaultPolicyData, }: {
    packageInfo?: PackageInfo;
    newAgentPolicy: NewAgentPolicy;
    withSysMonitoring: boolean;
    selectedPolicyTab: SelectedPolicyTab;
    agentCount: number;
    queryParamsPolicyId: string | undefined;
    integrationToEnable?: string;
    hasFleetAddAgentsPrivileges: boolean;
    setNewAgentPolicy: (policy: NewAgentPolicy) => void;
    setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
    isAddIntegrationFlyout?: boolean;
    defaultPolicyData?: Partial<NewPackagePolicy>;
}): {
    agentPolicies: AgentPolicy[];
    updateAgentPolicies: (updatedAgentPolicies: AgentPolicy[]) => void;
    packagePolicy: NewPackagePolicy;
    updatePackagePolicy: (updatedFields: Partial<NewPackagePolicy>) => void;
    savedPackagePolicy: PackagePolicy | undefined;
    onSubmit: ({ force, overrideCreatedAgentPolicy, skipConfirmModal, }?: {
        overrideCreatedAgentPolicy?: AgentPolicy;
        force?: boolean;
        skipConfirmModal?: boolean;
    }) => Promise<void>;
    formState: PackagePolicyFormState;
    setFormState: React.Dispatch<React.SetStateAction<PackagePolicyFormState>>;
    hasErrors: boolean;
    validationResults: PackagePolicyValidationResults | undefined;
    setValidationResults: React.Dispatch<React.SetStateAction<PackagePolicyValidationResults | undefined>>;
    hasAgentPolicyError: boolean;
    setHasAgentPolicyError: React.Dispatch<React.SetStateAction<boolean>>;
    isInitialized: boolean;
    navigateAddAgent: (policy: PackagePolicy) => void;
    navigateAddAgentHelp: (policy: PackagePolicy) => void;
    handleSetupTechnologyChange: (setupTechnology: SetupTechnology) => void;
    allowedSetupTechnologies: SetupTechnology[];
    selectedSetupTechnology: SetupTechnology;
    defaultSetupTechnology: SetupTechnology;
    isAgentlessSelected: boolean;
};
