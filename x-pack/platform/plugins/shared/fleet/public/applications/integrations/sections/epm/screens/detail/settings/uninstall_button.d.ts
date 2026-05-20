import React from 'react';
import type { PackageInfo } from '../../../../../types';
import type { InstallationInfo } from '../../../../../../../../common/types';
interface UninstallButtonProps extends Pick<PackageInfo, 'name' | 'title' | 'version'> {
    disabled?: boolean;
    installationInfo?: InstallationInfo;
    latestVersion?: string;
}
export declare const UninstallButton: React.FunctionComponent<UninstallButtonProps>;
export {};
