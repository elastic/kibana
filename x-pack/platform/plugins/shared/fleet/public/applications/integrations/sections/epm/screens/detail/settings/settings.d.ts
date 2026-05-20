import React from 'react';
import type { FleetStartServices } from '../../../../../../../plugin';
import type { PackageInfo, PackageMetadata, RegistryPolicyTemplate } from '../../../../../types';
interface Props {
    packageInfo: PackageInfo;
    packageMetadata?: PackageMetadata;
    startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
    isCustomPackage: boolean;
    integrationInfo?: RegistryPolicyTemplate;
}
export declare const SettingsPage: React.FC<Props>;
export {};
