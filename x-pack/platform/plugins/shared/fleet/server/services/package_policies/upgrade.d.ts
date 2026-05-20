import type { ElasticsearchClient, SavedObjectsClientContract, AuthenticatedUser } from '@kbn/core/server';
import type { ExperimentalDataStreamFeature, UpgradePackagePolicyDryRunResponseItem } from '../../../common/types';
import type { PackageInfo, PackagePolicy, UpgradePackagePolicyResponse } from '../../../common';
import type { PackagePolicyClient } from '../package_policy_service';
export declare function _getUpgradePackagePolicyInfo({ packagePolicyService, soClient, id, packagePolicy, pkgVersion, }: {
    packagePolicyService: PackagePolicyClient;
    soClient: SavedObjectsClientContract;
    id: string;
    packagePolicy?: PackagePolicy;
    pkgVersion?: string;
}): Promise<{
    packagePolicy: PackagePolicy;
    packageInfo: PackageInfo;
    experimentalDataStreamFeatures: ExperimentalDataStreamFeature[];
}>;
export declare function _packagePoliciesBulkUpgrade({ packagePolicyService, soClient, esClient, ids, options, pkgVersion, }: {
    packagePolicyService: PackagePolicyClient;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    ids: string[];
    options?: {
        user?: AuthenticatedUser;
        force?: boolean;
    };
    pkgVersion?: string;
}): Promise<UpgradePackagePolicyResponse>;
export declare function _packagePoliciesUpgrade({ soClient, esClient, packagePolicyService, id, options, packagePolicy, pkgVersion, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    packagePolicyService: PackagePolicyClient;
    id: string;
    options?: {
        user?: AuthenticatedUser;
        force?: boolean;
    };
    packagePolicy?: PackagePolicy;
    pkgVersion?: string;
}): Promise<UpgradePackagePolicyResponse>;
export declare function _packagePoliciesGetUpgradeDryRunDiff({ soClient, packagePolicyService, id, packagePolicy, pkgVersion, }: {
    soClient: SavedObjectsClientContract;
    packagePolicyService: PackagePolicyClient;
    id: string;
    packagePolicy?: PackagePolicy;
    pkgVersion?: string;
}): Promise<UpgradePackagePolicyDryRunResponseItem>;
