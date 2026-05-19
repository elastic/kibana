import React from 'react';
import type { FilterMode } from '../types';
interface RecentCasesFilterOptions {
    id: string;
    label: string;
}
export declare const caseFilterOptions: RecentCasesFilterOptions[];
export declare const RecentCasesFilters: React.NamedExoticComponent<{
    filterBy: FilterMode;
    setFilterBy: (filterBy: FilterMode) => void;
    hasCurrentUserInfo: boolean;
    isLoading?: boolean;
}>;
export {};
