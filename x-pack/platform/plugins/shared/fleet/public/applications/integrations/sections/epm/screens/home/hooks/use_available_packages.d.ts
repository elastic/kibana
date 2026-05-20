import type { IntegrationPreferenceType } from '../../../components/integration_preference';
import type { IntegrationCardItem } from '..';
import type { CategoryFacet } from '../category_facets';
export interface IntegrationsURLParameters {
    searchString?: string;
    categoryId?: string;
    subCategoryId?: string;
    onlyAgentless?: boolean;
    showDeprecated?: boolean;
}
export type AvailablePackagesHookType = typeof useAvailablePackages;
export declare const useAvailablePackages: ({ prereleaseIntegrationsEnabled, }: {
    prereleaseIntegrationsEnabled: boolean;
}) => {
    initialSelectedCategory: string;
    selectedCategory: string;
    setCategory: import("react").Dispatch<import("react").SetStateAction<string>>;
    allCategories: CategoryFacet[];
    mainCategories: CategoryFacet[];
    availableSubCategories: CategoryFacet[];
    selectedSubCategory: string | undefined;
    setSelectedSubCategory: import("react").Dispatch<import("react").SetStateAction<string | undefined>>;
    searchTerm: string;
    setSearchTerm: import("react").Dispatch<import("react").SetStateAction<string>>;
    setUrlandPushHistory: ({ searchString, categoryId, subCategoryId, onlyAgentless, }: import("./use_build_integrations_url").IntegrationsURLParameters) => void;
    setUrlandReplaceHistory: ({ searchString, categoryId, subCategoryId, onlyAgentless, }: import("./use_build_integrations_url").IntegrationsURLParameters) => void;
    preference: IntegrationPreferenceType;
    setPreference: import("react").Dispatch<import("react").SetStateAction<IntegrationPreferenceType>>;
    onlyAgentlessFilter: boolean;
    setOnlyAgentlessFilter: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    isAgentlessEnabled: boolean;
    isLoading: boolean;
    isLoadingCategories: boolean;
    isLoadingAllPackages: boolean;
    isLoadingAppendCustomIntegrations: boolean;
    eprPackageLoadingError: import("../../../../../hooks").RequestError | null;
    eprCategoryLoadingError: import("../../../../../hooks").RequestError | null;
    filteredCards: IntegrationCardItem[];
    allCards: IntegrationCardItem[];
};
