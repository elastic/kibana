import type { Installation, PackagePolicy } from '../../common/types';
export interface InMemoryPackagePolicy extends PackagePolicy {
    packageName?: string;
    packageTitle?: string;
    packageVersion?: string;
    type?: string;
    hasUpgrade: boolean;
    upgradeVersion?: string;
    pendingUpgradeReview?: Installation['pending_upgrade_review'];
    keepPoliciesUpToDate?: boolean;
}
