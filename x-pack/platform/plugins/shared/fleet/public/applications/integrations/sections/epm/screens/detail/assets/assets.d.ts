import React from 'react';
import type { PackageInfo } from '../../../../../types';
interface AssetsPanelProps {
    packageInfo: PackageInfo;
    refetchPackageInfo: () => void;
}
export declare const AssetsPage: ({ packageInfo, refetchPackageInfo }: AssetsPanelProps) => React.JSX.Element;
export {};
