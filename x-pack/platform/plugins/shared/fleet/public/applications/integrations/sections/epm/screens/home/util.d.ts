import type { IntegrationCardItem } from '.';
import type { CategoryFacet } from './category_facets';
export declare function mergeCategoriesAndCount(eprCategoryList: CategoryFacet[], // EPR-categories from backend call to EPR
cards: IntegrationCardItem[]): CategoryFacet[];
