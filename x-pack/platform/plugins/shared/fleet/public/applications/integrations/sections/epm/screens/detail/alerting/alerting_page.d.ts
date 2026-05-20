import React from 'react';
import type { PackageInfo } from '../../../../../types';
interface AlertingPageProps {
    packageInfo: PackageInfo;
    refetchPackageInfo: () => void;
}
export declare const AlertingPage: ({ packageInfo, refetchPackageInfo }: AlertingPageProps) => React.JSX.Element;
export {};
