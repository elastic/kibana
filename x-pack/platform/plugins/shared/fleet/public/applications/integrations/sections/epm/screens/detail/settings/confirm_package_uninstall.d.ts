import React from 'react';
interface ConfirmPackageUninstallProps {
    onCancel: () => void;
    onConfirm: () => void;
    packageName: string;
    numOfAssets: number;
}
export declare const ConfirmPackageUninstall: (props: ConfirmPackageUninstallProps) => React.JSX.Element;
export {};
