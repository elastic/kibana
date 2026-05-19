import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicy, NewPackagePolicy, PackagePolicySOAttributes, PackageInfo } from '../../types';
export declare const mapPackagePolicySavedObjectToPackagePolicy: ({ id, version, attributes, namespaces, }: SavedObject<PackagePolicySOAttributes>) => PackagePolicy;
export declare function preflightCheckPackagePolicy(soClient: SavedObjectsClientContract, packagePolicy: PackagePolicy | NewPackagePolicy, packageInfo?: PackageInfo): Promise<void>;
export declare function canUseMultipleAgentPolicies(): {
    canUseReusablePolicies: boolean | undefined;
    errorMessage: string;
};
export declare function canUseOutputForIntegration(soClient: SavedObjectsClientContract, packagePolicy: Pick<PackagePolicy, 'output_id' | 'package' | 'supports_agentless'>): Promise<{
    canUseOutputForIntegrationResult: boolean;
    errorMessage: string;
} | {
    canUseOutputForIntegrationResult: boolean;
    errorMessage: null;
}>;
export declare function canDeployCustomPackageAsAgentlessOrThrow(packagePolicy: NewPackagePolicy, packageInfo: PackageInfo): boolean;
