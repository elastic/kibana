import React from 'react';
import type { InstallationInfo } from '../../../../../../../../server/types';
import { type PackageInfo } from '../../../../../types';
interface RollbackButtonProps {
    packageInfo: PackageInfo & {
        installationInfo?: InstallationInfo;
    };
    isCustomPackage: boolean;
}
export declare function RollbackButton({ packageInfo, isCustomPackage }: RollbackButtonProps): React.JSX.Element;
export {};
