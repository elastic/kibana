import type { InstalledPackageUIPackageListItem } from '../types';
export declare function useInstalledIntegrationsActions(): {
    actions: {
        bulkUpgradeIntegrationsWithConfirmModal: (selectedItems: InstalledPackageUIPackageListItem[]) => Promise<void>;
        bulkUninstallIntegrationsWithConfirmModal: (selectedItems: InstalledPackageUIPackageListItem[]) => Promise<void>;
        bulkRollbackIntegrationsWithConfirmModal: (selectedItems: InstalledPackageUIPackageListItem[], onActionCompleted?: (status: string) => void) => Promise<string>;
    };
    upgradingIntegrations: InstalledPackageUIPackageListItem[];
    uninstallingIntegrations: InstalledPackageUIPackageListItem[];
    rollingbackIntegrations: InstalledPackageUIPackageListItem[];
};
