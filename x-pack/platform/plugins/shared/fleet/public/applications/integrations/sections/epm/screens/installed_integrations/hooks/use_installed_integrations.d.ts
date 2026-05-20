import { type Pagination } from '../../../../../../../hooks';
import type { InstalledIntegrationsFilter, InstalledPackageUIPackageListItem } from '../types';
export declare function useInstalledIntegrations(filters: InstalledIntegrationsFilter, pagination: Pagination, upgradingIntegrations?: InstalledPackageUIPackageListItem[], uninstallingIntegrations?: InstalledPackageUIPackageListItem[], rollingbackIntegrations?: InstalledPackageUIPackageListItem[], prereleaseIntegrationsEnabled?: boolean): {
    total: number;
    countPerStatus: {
        [k: string]: number | undefined;
    };
    customIntegrationsCount: number;
    installedPackages: InstalledPackageUIPackageListItem[];
    isInitialLoading: boolean;
    isLoading: boolean;
};
