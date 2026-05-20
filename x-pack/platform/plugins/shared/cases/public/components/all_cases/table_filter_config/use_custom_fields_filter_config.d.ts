import type { CasesConfigurationUI } from '../../../../common/ui';
import type { FilterChangeHandler, FilterConfig } from './types';
export declare const useCustomFieldsFilterConfig: ({ isSelectorView, customFields, isLoading, onFilterOptionsChange, }: {
    isSelectorView: boolean;
    customFields: CasesConfigurationUI["customFields"];
    isLoading: boolean;
    onFilterOptionsChange: FilterChangeHandler;
}) => {
    customFieldsFilterConfig: FilterConfig[];
};
