import React from 'react';
import { type ViewToggleId } from '../constants';
import type { CaseStatuses } from '../../../../../common/types/domain';
import type { FilterOptions } from '../../../../containers/types';
import type { CurrentUserProfile } from '../../../types';
import type { CasesColumnSelection } from '../types';
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
    viewMode: ViewToggleId;
    onViewModeChange: (mode: ViewToggleId) => void;
    selectedColumns: CasesColumnSelection[];
    onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
    listFields: CasesColumnSelection[];
    onListFieldsChange: (fields: CasesColumnSelection[]) => void;
    sortOrder: 'asc' | 'desc';
    onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}
export declare const CasesTableFilters: React.MemoExoticComponent<{
    ({ countClosedCases, countOpenCases, countInProgressCases, onFilterChanged, hiddenStatuses, availableSolutions, isSelectorView, onCreateCasePressed, isLoading, currentUserProfile, filterOptions, deselectCases, viewMode, onViewModeChange, selectedColumns, onSelectedColumnsChange, listFields, onListFieldsChange, sortOrder, onSortOrderChange, }: CasesTableFiltersProps): React.JSX.Element;
    displayName: string;
}>;
