import React from 'react';
import type { PackageInfo } from '../../../../../types';
type ReinstallationButtonProps = Pick<PackageInfo, 'name' | 'title' | 'version'> & {
    installSource: string;
    isCustomPackage: boolean;
};
export declare function ReinstallButton(props: ReinstallationButtonProps): React.JSX.Element | null;
export {};
