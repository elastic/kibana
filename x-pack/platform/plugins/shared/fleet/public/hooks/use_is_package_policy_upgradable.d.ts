import type { Installation } from '../../common/types';
import type { PackagePolicy } from '../types';
export declare const useIsPackagePolicyUpgradable: () => {
    isPackagePolicyUpgradable: (pkgPolicy: PackagePolicy) => boolean;
    getPackagePolicyUpgradeReview: (pkgPolicy: PackagePolicy) => Installation["pending_upgrade_review"] | undefined;
    getKeepPoliciesUpToDate: (pkgPolicy: PackagePolicy) => boolean;
    getUpgradeVersion: (pkgPolicy: PackagePolicy) => string | undefined;
    isLoadingPackages: boolean;
};
