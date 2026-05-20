import type { FunctionComponent } from 'react';
import type { ExtendedIntegrationCategory, CategoryFacet } from '../../screens/home/category_facets';
import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';
export interface Props {
    searchTerm: string;
    setSearchTerm: (search: string) => void;
    selectedCategory: ExtendedIntegrationCategory;
    setCategory: (category: ExtendedIntegrationCategory) => void;
    categories: CategoryFacet[];
    availableSubCategories?: CategoryFacet[];
    setUrlandReplaceHistory: (params: IntegrationsURLParameters) => void;
    selectedSubCategory?: string;
    setSelectedSubCategory?: (c: string | undefined) => void;
    onlyAgentlessFilter?: boolean;
}
export declare const SearchBox: FunctionComponent<Props>;
