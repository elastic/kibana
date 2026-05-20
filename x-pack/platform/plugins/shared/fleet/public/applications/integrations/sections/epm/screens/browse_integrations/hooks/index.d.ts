import type { IntegrationCardItem } from '../../home';
export declare function useBrowseIntegrationHook({ prereleaseIntegrationsEnabled, }: {
    prereleaseIntegrationsEnabled: boolean;
}): {
    initialSelectedCategory: string;
    selectedCategory: string;
    allCategories: {
        count: number;
        id: string;
        title: string;
        parent_id?: string;
        parent_title?: string;
    }[];
    mainCategories: {
        count: number;
        id: string;
        title: string;
        parent_id?: string;
        parent_title?: string;
    }[];
    isLoading: boolean;
    isLoadingCategories: boolean;
    isLoadingAllPackages: boolean;
    isLoadingAppendCustomIntegrations: boolean;
    eprPackageLoadingError: import("../../../../../hooks").RequestError | null;
    eprCategoryLoadingError: import("../../../../../hooks").RequestError | null;
    filteredCards: IntegrationCardItem[];
    availableSubCategories: {
        count: number;
        id: string;
        title: string;
        parent_id?: string;
        parent_title?: string;
    }[];
    onCategoryChange: ({ id }: {
        id: string;
    }) => void;
    onSortChange: (sortKey: string) => void;
};
