import React from 'react';
interface ConfirmPackageInstallProps {
    onCancel: () => void;
    onConfirm: () => void;
    packageName: string;
    numOfAssets: number;
    numOfTransformAssets: number;
}
export declare const ConfirmPackageInstall: (props: ConfirmPackageInstallProps) => React.JSX.Element;
export {};
