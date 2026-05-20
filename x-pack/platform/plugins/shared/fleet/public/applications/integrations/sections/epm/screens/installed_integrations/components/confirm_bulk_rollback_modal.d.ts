import React from 'react';
import type { InstalledPackageUIPackageListItem } from '../types';
export declare const ConfirmBulkRollbackModal: React.FunctionComponent<{
    selectedItems: InstalledPackageUIPackageListItem[];
    onClose: () => void;
    onConfirm: () => void;
}>;
