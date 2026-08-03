import React from 'react';
import type { MultiSelectFilterOption } from '../multi_select_filter';
export declare const MoreFiltersSelectable: {
    ({ options, activeFilters, onChange, isLoading, }: {
        options: Array<MultiSelectFilterOption<string>>;
        activeFilters: string[];
        isLoading: boolean;
        onChange: (params: {
            filterId: string;
            selectedOptionKeys: string[];
        }) => void;
    }): React.JSX.Element;
    displayName: string;
};
