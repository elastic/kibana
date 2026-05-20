import type { PackageListItem } from '../../../../../../../common';
export type InstalledPackagesUIInstallationStatus = 'not_installed' | 'installing' | 'installed' | 'install_failed' | 'upgrade_failed' | 'upgrading' | 'upgrade_available' | 'pending_upgrade_review' | 'declined_review' | 'uninstalling' | 'rolling_back';
export type InstalledPackageUIPackageListItem = PackageListItem & {
    ui: {
        installation_status: InstalledPackagesUIInstallationStatus;
    };
};
export interface InstalledIntegrationsFilter {
    installationStatus?: InstalledPackagesUIInstallationStatus[];
    customIntegrations?: boolean;
    q?: string;
}
