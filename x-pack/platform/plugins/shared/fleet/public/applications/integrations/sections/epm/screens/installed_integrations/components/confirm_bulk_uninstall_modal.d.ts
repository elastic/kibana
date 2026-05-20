import React from 'react';
import type { InstalledPackageUIPackageListItem } from '../types';
export declare const ConfirmBulkUninstallModal: React.FunctionComponent<{
    selectedItems: InstalledPackageUIPackageListItem[];
    onClose: () => void;
    onConfirm: () => void;
}>;
