import React from 'react';
import type { CaseStatuses } from '../../../common/types/domain';
import type { FilterOptions } from '../../containers/types';
import type { CurrentUserProfile } from '../types';
export interface CasesTableFiltersProps {
    countClosedCases: number | null;
    countInProgressCases: number | null;
    countOpenCases: number | null;
    onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
    hiddenStatuses?: CaseStatuses[];
    availableSolutions: string[];
    isSelectorView?: boolean;
    onCreateCasePressed?: () => void;
    isLoading: boolean;
    currentUserProfile: CurrentUserProfile;
    filterOptions: FilterOptions;
    deselectCases: () => void;
}
export declare const CasesTableFilters: React.MemoExoticComponent<{
    ({ countClosedCases, countOpenCases, countInProgressCases, onFilterChanged, hiddenStatuses, availableSolutions, isSelectorView, onCreateCasePressed, isLoading, currentUserProfile, filterOptions, deselectCases, }: CasesTableFiltersProps): React.JSX.Element;
    displayName: string;
}>;
