import React from 'react';
import type { PackageInfo } from '../../../types';
import type { InstallationInfo } from '../../../../common/types';
import type { FleetStartServices } from '../../../plugin';
import { InstallStatus } from '../../../types';
import type { InstalledPackageUIPackageListItem } from '../sections/epm/screens/installed_integrations/types';
type StartServices = Pick<FleetStartServices, 'notifications' | 'analytics' | 'i18n' | 'theme'>;
interface PackageInstallItem {
    status: InstallStatus;
    version: string | null;
}
type InstallPackageProps = Pick<PackageInfo, 'name' | 'version' | 'title'> & {
    isReinstall?: boolean;
    isUpgrade?: boolean;
    force?: boolean;
};
type SetPackageInstallStatusProps = Pick<PackageInfo, 'name'> & PackageInstallItem;
export declare const PackageInstallProvider: React.FC<React.PropsWithChildren<{
    startServices: StartServices;
}>>, useInstallPackage: () => (props: InstallPackageProps) => Promise<boolean>, useSetPackageInstallStatus: () => ({ name, status, version }: SetPackageInstallStatusProps) => void, useGetPackageInstallStatus: () => (pkg: string) => PackageInstallItem, useUninstallPackage: () => ({ name, version, title, redirectToVersion, }: Pick<PackageInfo, "name" | "version" | "title"> & {
    redirectToVersion: string;
}) => Promise<void>, useRollbackPackage: () => (packageInfo: PackageInfo & {
    installationInfo?: InstallationInfo;
}, bulkRollbackIntegrationsWithConfirmModal: (selectedItems: InstalledPackageUIPackageListItem[], onActionCompleted?: (status: string) => void) => Promise<string>) => Promise<void>;
export {};
