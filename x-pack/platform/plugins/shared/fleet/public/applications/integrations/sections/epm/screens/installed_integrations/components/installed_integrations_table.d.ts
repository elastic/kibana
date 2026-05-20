import React from 'react';
import { type UrlPagination } from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';
export declare const InstalledIntegrationsTable: React.FunctionComponent<{
    installedPackages: InstalledPackageUIPackageListItem[];
    total: number;
    isLoading: boolean;
    pagination: UrlPagination;
    selection: {
        selectedItems: InstalledPackageUIPackageListItem[];
        setSelectedItems: React.Dispatch<React.SetStateAction<InstalledPackageUIPackageListItem[]>>;
    };
}>;
