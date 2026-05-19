import type { CasesConfigurationUI, FilterOptions } from '../../../../common/ui';
import type { FilterConfig } from './types';
export declare const useFilterConfig: ({ isSelectorView, onFilterOptionsChange, systemFilterConfig, filterOptions, customFields, isLoading, }: {
    isSelectorView: boolean;
    isLoading: boolean;
    onFilterOptionsChange: (params: Partial<FilterOptions>) => void;
    systemFilterConfig: FilterConfig[];
    filterOptions: FilterOptions;
    customFields: CasesConfigurationUI["customFields"];
}) => {
    activeSelectableOptionKeys: string[];
    filters: FilterConfig[];
    onFilterConfigChange: ({ selectedOptionKeys }: {
        filterId: string;
        selectedOptionKeys: string[];
    }) => void;
    selectableOptions: {
        key: string;
        label: string;
    }[];
};
