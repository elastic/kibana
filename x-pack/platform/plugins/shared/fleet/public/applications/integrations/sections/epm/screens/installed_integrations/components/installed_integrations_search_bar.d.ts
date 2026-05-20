import React from 'react';
import type { InstalledIntegrationsFilter, InstalledPackageUIPackageListItem } from '../types';
export declare const InstalledIntegrationsSearchBar: React.FunctionComponent<{
    filters: InstalledIntegrationsFilter;
    countPerStatus: {
        [k: string]: number | undefined;
    };
    customIntegrationsCount: number;
    selectedItems: InstalledPackageUIPackageListItem[];
}>;
