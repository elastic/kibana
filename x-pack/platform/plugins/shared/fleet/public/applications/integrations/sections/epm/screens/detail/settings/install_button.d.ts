import React from 'react';
import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
type InstallationButtonProps = Pick<PackageInfo, 'name' | 'title' | 'version' | 'assets'> & {
    disabled?: boolean;
    dryRunData?: UpgradePackagePolicyDryRunResponse | null;
    isUpgradingPackagePolicies?: boolean;
    latestVersion?: string;
    packagePolicyIds?: string[];
    setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
};
export declare function InstallButton(props: InstallationButtonProps): React.JSX.Element | null;
export {};
