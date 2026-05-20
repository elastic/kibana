import React from 'react';
import type { EpmPackageInstallStatus } from '../../../../../../common/types';
interface InstallationStatusProps {
    installStatus: EpmPackageInstallStatus | null | undefined;
    showInstallationStatus?: boolean;
    compressed?: boolean;
    hasDataStreams?: boolean;
}
export interface InstallationStatusStylesProps {
    installationStatus: string;
    installedCallout: string;
    installedSpacer: string;
}
export declare const getLineClampStyles: (lineClamp?: number) => string;
export declare const shouldShowInstallationStatus: ({ installStatus, isActive, showInstallationStatus, }: {
    installStatus: EpmPackageInstallStatus | null | undefined;
    isActive?: boolean;
    showInstallationStatus?: boolean;
}) => boolean | undefined;
export declare const InstallationStatus: React.FC<InstallationStatusProps>;
export {};
