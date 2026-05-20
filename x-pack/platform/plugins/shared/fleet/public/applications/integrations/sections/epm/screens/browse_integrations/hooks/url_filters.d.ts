import type { BrowseIntegrationsFilter } from '../types';
export declare function useAddUrlFilters(): (filters: Partial<BrowseIntegrationsFilter>, options?: {
    replace?: boolean;
}) => void;
export declare function useUrlFilters(): BrowseIntegrationsFilter;
