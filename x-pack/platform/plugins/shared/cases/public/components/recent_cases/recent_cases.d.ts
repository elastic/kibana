import React from 'react';
import type { FilterOptions } from '../../containers/types';
import type { FilterMode as RecentCasesFilterMode } from './types';
export interface RecentCasesProps {
    filterOptions: Partial<FilterOptions>;
    maxCasesToShow: number;
    recentCasesFilterBy: RecentCasesFilterMode;
}
export declare const RecentCasesComp: React.NamedExoticComponent<RecentCasesProps>;
