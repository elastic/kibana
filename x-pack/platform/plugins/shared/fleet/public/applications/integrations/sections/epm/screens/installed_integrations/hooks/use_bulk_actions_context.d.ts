import React from 'react';
import type { InstalledPackageUIPackageListItem } from '../types';
interface PollAction {
    taskId: string;
    type: 'bulk_upgrade' | 'bulk_uninstall' | 'bulk_rollback';
    integrations: InstalledPackageUIPackageListItem[];
}
export declare const bulkActionsContext: React.Context<{
    upgradingIntegrations: InstalledPackageUIPackageListItem[];
    uninstallingIntegrations: InstalledPackageUIPackageListItem[];
    rollingbackIntegrations: InstalledPackageUIPackageListItem[];
    bulkActions: {
        setPollingBulkActions: React.Dispatch<React.SetStateAction<PollAction[]>>;
        setActionCompletedCallback: React.Dispatch<React.SetStateAction<Function | undefined>>;
    };
}>;
export declare const BulkActionContextProvider: React.FunctionComponent<{
    children: React.ReactNode;
}>;
export {};
