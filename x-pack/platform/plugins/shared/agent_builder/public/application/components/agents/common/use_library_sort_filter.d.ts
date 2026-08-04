import type { LibraryItem } from './library_panel';
export type SortOrder = 'asc' | 'desc';
export type FilterMode = 'all' | 'active' | 'elastic' | 'custom';
export interface FilterCounts {
    all: number;
    active: number;
    elastic: number;
    custom: number;
}
interface UseLibrarySortFilterOptions<T extends LibraryItem> {
    allItems: T[];
    activeItemIdSet: Set<string>;
    readOnlyItemIdSet?: Set<string>;
    getItemName: (item: T) => string;
    getSearchableText?: (item: T) => string[];
}
interface UseLibrarySortFilterResult<T extends LibraryItem> {
    filteredItems: T[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sortOrder: SortOrder;
    setSortOrder: (order: SortOrder) => void;
    filterMode: FilterMode;
    setFilterMode: (mode: FilterMode) => void;
    filterCounts: FilterCounts;
}
export declare const useLibrarySortFilter: <T extends LibraryItem>({ allItems, activeItemIdSet, readOnlyItemIdSet, getItemName, getSearchableText, }: UseLibrarySortFilterOptions<T>) => UseLibrarySortFilterResult<T>;
export {};
