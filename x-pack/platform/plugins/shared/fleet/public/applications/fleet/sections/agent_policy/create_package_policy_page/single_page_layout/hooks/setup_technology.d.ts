import type { AgentPolicy, NewAgentPolicy, NewPackagePolicy, PackageInfo } from '../../../../../types';
import { SetupTechnology } from '../../../../../types';
import { SelectedPolicyTab } from '../../components';
export declare const useAgentless: () => {
    isAgentlessEnabled: boolean;
    isAgentlessDefault: boolean;
    isAgentlessAgentPolicy: (agentPolicy: AgentPolicy | undefined) => boolean;
    getAgentlessStatusForPackage: (packageInfo: PackageInfo | undefined, integrationToEnable?: string) => {
        isAgentless: boolean;
        isDefaultDeploymentMode: boolean;
    };
    isServerless: boolean;
    isCloud: boolean;
};
export declare function useSetupTechnology({ setNewAgentPolicy, newAgentPolicy, updatePackagePolicy, setSelectedPolicyTab, packageInfo, packagePolicy, isEditPage, agentPolicies, integrationToEnable, hideAgentlessSelector, }: {
    setNewAgentPolicy: (policy: NewAgentPolicy) => void;
    newAgentPolicy: NewAgentPolicy;
    updatePackagePolicy: (policy: Partial<NewPackagePolicy>) => void;
    setSelectedPolicyTab: (tab: SelectedPolicyTab) => void;
    packageInfo?: PackageInfo;
    packagePolicy: NewPackagePolicy;
    isEditPage?: boolean;
    agentPolicies?: AgentPolicy[];
    integrationToEnable?: string;
    hideAgentlessSelector?: boolean;
}): {
    handleSetupTechnologyChange: (setupTechnology: SetupTechnology) => void;
    allowedSetupTechnologies: SetupTechnology[];
    selectedSetupTechnology: SetupTechnology;
    defaultSetupTechnology: SetupTechnology;
};
export declare const isAgentlessSetupDefault: (isAgentlessDefault: boolean, packageInfo?: PackageInfo, integrationToEnable?: string) => boolean;
