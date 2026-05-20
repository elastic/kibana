import React from 'react';
import type { EpmPackageInstallStatus } from '../../../../../../common/types';
export interface CompressedInstallationStylesProps {
    compressedInstallationStatus: string;
    compressedActiveStatusIcon: string;
    compressedInstalledStatusIcon: string;
    compressedActiveStatus: string;
    compressedInstalledStatus: string;
}
export declare const CompressedInstallationStatus: React.FC<{
    installStatus: EpmPackageInstallStatus | null | undefined;
    isActive?: boolean;
    installedTooltip: string;
    installFailedTooltip: string;
    styles: CompressedInstallationStylesProps;
}>;
