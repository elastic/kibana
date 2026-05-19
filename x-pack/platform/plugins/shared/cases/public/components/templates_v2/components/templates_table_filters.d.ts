import React from 'react';
import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
export interface TemplatesTableFiltersProps {
    queryParams: TemplatesFindRequest;
    onQueryParamsChange: (params: Partial<TemplatesFindRequest>) => void;
    onRefresh: () => void;
    isLoading?: boolean;
    availableTags?: string[];
    availableCreatedBy?: string[];
    isLoadingTags?: boolean;
    isLoadingCreators?: boolean;
}
export declare const TemplatesTableFilters: React.NamedExoticComponent<TemplatesTableFiltersProps>;
