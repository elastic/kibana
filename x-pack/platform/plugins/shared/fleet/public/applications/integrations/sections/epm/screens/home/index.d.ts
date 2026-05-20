import React from 'react';
import type { CategoryFacet, ExtendedIntegrationCategory } from './category_facets';
export { mapToCard, type IntegrationCardItem } from './card_utils';
export interface CategoryParams {
    category?: ExtendedIntegrationCategory;
    subcategory?: string;
}
export declare const getParams: (params: CategoryParams, search: string) => {
    selectedCategory: string;
    searchParam: string;
    selectedSubcategory: string | undefined;
    onlyAgentless: boolean;
    showDeprecated: boolean | undefined;
};
export declare const categoryExists: (category: string, categories: CategoryFacet[]) => boolean;
export declare const EPMHomePage: React.FC;
