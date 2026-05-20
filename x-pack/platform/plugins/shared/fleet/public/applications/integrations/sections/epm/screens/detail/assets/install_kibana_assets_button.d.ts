import React from 'react';
import type { InstallationInfo } from '../../../../../../../../common/types';
interface InstallKibanaAssetsButtonProps {
    title: string;
    installInfo: InstallationInfo;
    onSuccess?: () => void;
}
export declare function InstallKibanaAssetsButton({ installInfo, title, onSuccess, }: InstallKibanaAssetsButtonProps): React.JSX.Element;
export {};
