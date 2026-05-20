import type { UpgradePackagePolicyDryRunResponse } from '../../../../../../../common/types/rest_spec';
import type { UpdatePackagePolicy, AgentPolicy, PackagePolicy, PackageInfo } from '../../../../types';
import { type PackagePolicyValidationResults } from '../../create_package_policy_page/services';
import type { PackagePolicyFormState } from '../../create_package_policy_page/types';
export declare function usePackagePolicyWithRelatedData(packagePolicyId: string, options: {
    forceUpgrade?: boolean;
}): {
    formState: PackagePolicyFormState;
    validationResults: PackagePolicyValidationResults | undefined;
    hasErrors: boolean;
    upgradeDryRunData: UpgradePackagePolicyDryRunResponse | undefined;
    setFormState: import("react").Dispatch<import("react").SetStateAction<PackagePolicyFormState>>;
    updatePackagePolicy: (updatedFields: Partial<UpdatePackagePolicy>) => void;
    isEdited: boolean;
    setIsEdited: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    packageInfo: PackageInfo | undefined;
    isUpgrade: boolean;
    savePackagePolicy: (packagePolicyOverride?: Partial<PackagePolicy>) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<import("../../../../types").CreatePackagePolicyResponse, import("../../../../hooks").RequestError>>;
    isLoadingData: boolean;
    agentPolicies: AgentPolicy[];
    loadingError: Error | undefined;
    packagePolicy: UpdatePackagePolicy;
    originalPackagePolicy: PackagePolicy | undefined;
};
