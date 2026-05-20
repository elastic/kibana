import React from 'react';
import type { FleetStartServices } from '../../../../../../../plugin';
import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
interface UpdateButtonProps extends Pick<PackageInfo, 'name' | 'title' | 'version'> {
    dryRunData?: UpgradePackagePolicyDryRunResponse | null;
    packagePolicyIds?: string[];
    agentPolicyIds: string[];
    isUpgradingPackagePolicies?: boolean;
    setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
    startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
    isDisabled?: boolean;
}
export declare const UpdateButton: React.FunctionComponent<UpdateButtonProps>;
export {};
