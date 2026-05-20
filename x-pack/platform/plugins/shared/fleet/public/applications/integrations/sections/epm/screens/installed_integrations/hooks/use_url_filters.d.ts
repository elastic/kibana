import type { InstalledIntegrationsFilter } from '../types';
export declare function useAddUrlFilters(): (filters: Partial<InstalledIntegrationsFilter>) => void;
export declare function useViewPolicies(): {
    addViewPolicies: (packageName: string) => void;
    selectedPackageViewPolicies: string | undefined;
};
export declare function useUrlFilters(): InstalledIntegrationsFilter;
