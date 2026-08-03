import React from 'react';
import type { FilterOptions } from '../../containers/types';
interface DateRangeFilterProps {
    filterOptions: FilterOptions;
    onFilterOptionsChange: (filterOptions: Partial<FilterOptions>) => void;
    isLoading: boolean;
    deselectCases: () => void;
}
export declare const DateRangeFilter: {
    ({ filterOptions, onFilterOptionsChange, isLoading, deselectCases, }: DateRangeFilterProps): React.JSX.Element;
    displayName: string;
};
export {};
