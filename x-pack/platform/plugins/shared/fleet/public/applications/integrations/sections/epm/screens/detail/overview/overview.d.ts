import React from 'react';
import type { PackageInfo, RegistryPolicyTemplate } from '../../../../../types';
interface Props {
    packageInfo: PackageInfo;
    integrationInfo?: RegistryPolicyTemplate;
    latestGAVersion?: string;
}
export declare const getAnchorId: (name: string | undefined, index?: number) => string;
export declare const OverviewPage: React.FC<Props>;
export {};
