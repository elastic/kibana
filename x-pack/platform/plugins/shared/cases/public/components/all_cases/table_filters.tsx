/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { mergeWith, isEqual } from 'lodash';
import { MoreFiltersSelectable } from './table_filter_config/more_filters_selectable';
import type { CaseStatuses } from '../../../common/types/domain';
import type { FilterOptions } from '../../containers/types';
import * as i18n from './translations';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import type { CurrentUserProfile } from '../types';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useSystemFilterConfig } from './table_filter_config/use_system_filter_config';
import { useFilterConfig } from './table_filter_config/use_filter_config';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { TableSearch } from './search';

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
}

const mergeCustomizer = (objValue: string | string[], srcValue: string | string[], key: string) => {
  if (Array.isArray(objValue)) {
    return srcValue;
  }
};

const CasesTableFiltersComponent = ({
  countClosedCases,
  countOpenCases,
  countInProgressCases,
  onFilterChanged,
  hiddenStatuses,
  availableSolutions,
  isSelectorView = false,
  onCreateCasePressed,
  isLoading,
  currentUserProfile,
  filterOptions,
}: CasesTableFiltersProps) => {
  const { data: tags = [], isLoading: isLoadingTags } = useGetTags();
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategories();
  const { caseAssignmentAuthorized } = useCasesFeatures();
  const {
    data: { customFields },
    isFetching: isLoadingCasesConfiguration,
  } = useGetCaseConfiguration();

  const onFilterOptionsChange = useCallback(
    (partialFilterOptions: Partial<FilterOptions>) => {
      const newFilterOptions = mergeWith({}, filterOptions, partialFilterOptions, mergeCustomizer);
      if (!isEqual(newFilterOptions, filterOptions)) {
        onFilterChanged(newFilterOptions);
      }
    },
    [filterOptions, onFilterChanged]
  );

  const isLoadingFilters =
    isLoading || isLoadingTags || isLoadingCategories || isLoadingCasesConfiguration;

  const { systemFilterConfig } = useSystemFilterConfig({
    availableSolutions,
    caseAssignmentAuthorized,
    categories,
    countClosedCases,
    countInProgressCases,
    countOpenCases,
    currentUserProfile,
    hiddenStatuses,
    isLoading: isLoadingFilters,
    isSelectorView,
    onFilterOptionsChange,
    tags,
  });

  const {
    filters: activeFilters,
    selectableOptions,
    activeSelectableOptionKeys,
    onFilterConfigChange,
  } = useFilterConfig({
    systemFilterConfig,
    onFilterOptionsChange,
    isSelectorView,
    filterOptions,
    customFields,
    isLoading: isLoadingFilters,
  });

  const handleOnCreateCasePressed = useCallback(() => {
    if (onCreateCasePressed) {
      onCreateCasePressed();
    }
  }, [onCreateCasePressed]);

  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexStart"
      wrap={true}
      data-test-subj="cases-table-filters"
    >
      {isSelectorView && onCreateCasePressed ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleOnCreateCasePressed}
            iconType="plusInCircle"
            data-test-subj="cases-table-add-case-filter-bar"
          >
            {i18n.CREATE_CASE_TITLE}
          </EuiButton>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <TableSearch
          filterOptionsSearch={filterOptions.search}
          /**
           * we need this to reset the internal state of the
           * TableSearch component each time the search in
           * the all cases state changes
           */
          key={filterOptions.search}
          onFilterOptionsChange={onFilterOptionsChange}
        />
      </EuiFlexItem>
      {activeFilters.map((filter) => (
        <EuiFlexItem grow={false} key={filter.key}>
          {filter.render({ filterOptions })}
        </EuiFlexItem>
      ))}

      {isSelectorView || (
        <EuiFlexItem grow={false}>
          <MoreFiltersSelectable
            options={selectableOptions}
            activeFilters={activeSelectableOptionKeys}
            onChange={onFilterConfigChange}
            isLoading={isLoadingFilters}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
