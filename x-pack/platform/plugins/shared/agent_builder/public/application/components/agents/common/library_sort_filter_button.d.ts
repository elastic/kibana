import React from 'react';
import type { FilterCounts, FilterMode, SortOrder } from './use_library_sort_filter';
interface LibrarySortFilterButtonProps {
    sortOrder: SortOrder;
    onSortChange: (order: SortOrder) => void;
    filterMode: FilterMode;
    onFilterChange: (mode: FilterMode) => void;
    filterCounts: FilterCounts;
}
export declare const LibrarySortFilterButton: React.FC<LibrarySortFilterButtonProps>;
export {};
