import React from 'react';
import type { CategoryFacet } from '../../home/category_facets';
export declare const StickyFlexItem: import("@emotion/styled").StyledComponent<{
    children?: React.ReactNode | undefined;
} & import("@elastic/eui").CommonProps & Omit<any, "ref"> & {
    grow?: boolean | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | null;
    component?: React.ElementType | undefined;
} & {
    ref?: React.Ref<unknown> | undefined;
} & {
    theme?: import("@emotion/react").Theme;
}, {}, {}>;
interface SearchAndFiltersBarProps {
    categories?: CategoryFacet[];
    availableSubCategories?: CategoryFacet[];
}
export declare const SearchAndFiltersBar: React.FC<SearchAndFiltersBarProps>;
export {};
