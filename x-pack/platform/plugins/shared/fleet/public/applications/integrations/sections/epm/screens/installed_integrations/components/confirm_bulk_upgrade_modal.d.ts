import React from 'react';
import type { InstalledPackageUIPackageListItem } from '../types';
export declare const ViewChangelog: React.FunctionComponent<{
    pkgName: string;
    pkgVersion: string;
}>;
export declare const ConfirmBulkUpgradeModal: React.FunctionComponent<{
    selectedItems: InstalledPackageUIPackageListItem[];
    onClose: () => void;
    onConfirm: (params: {
        updatePolicies: boolean;
    }) => void;
}>;
