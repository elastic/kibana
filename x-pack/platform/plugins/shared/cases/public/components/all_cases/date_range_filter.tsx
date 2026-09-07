/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiFlexItem, EuiFlexGroup, EuiLink, EuiSuperDatePicker } from '@elastic/eui';
import type { FilterOptions } from '../../containers/types';
import { useRefreshCases } from './use_on_refresh_cases';
import { CUSTOM_QUICK_SELECT_PANEL, LAST_30_DAYS, SHOW_ALL_CASES } from './translations';
import { useGetEarliestCase } from './use_get_earliest_case';
import { DEFAULT_FROM_DATE } from '../../containers/constants';

interface DateRangeFilterProps {
  filterOptions: FilterOptions;
  onFilterOptionsChange: (filterOptions: Partial<FilterOptions>) => void;
  isLoading: boolean;
  deselectCases: () => void;
}

export const DateRangeFilter = ({
  filterOptions,
  onFilterOptionsChange,
  isLoading,
  deselectCases,
}: DateRangeFilterProps) => {
  const refreshCases = useRefreshCases();
  const { earliestCase, isLoading: isLoadingEarliestCase } = useGetEarliestCase(filterOptions);

  const onRefresh = useCallback(() => {
    deselectCases();
    refreshCases();
  }, [deselectCases, refreshCases]);

  const onTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      onFilterOptionsChange({ from: start, to: end });
    },
    [onFilterOptionsChange]
  );

  const onShowAllCases = useCallback(() => {
    const fromDate = earliestCase?.createdAt ?? DEFAULT_FROM_DATE;
    onFilterOptionsChange({ from: fromDate, to: 'now' });
  }, [onFilterOptionsChange, earliestCase]);

  const onLast30Days = useCallback(() => {
    onFilterOptionsChange({ from: 'now-30d', to: 'now' });
  }, [onFilterOptionsChange]);

  const customQuickSelectPanels = useMemo(
    () => [
      {
        title: CUSTOM_QUICK_SELECT_PANEL,
        content: (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiLink onClick={onShowAllCases} data-test-subj="show-all-cases-link">
                {SHOW_ALL_CASES}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={onLast30Days} data-test-subj="last-30-days-link">
                {LAST_30_DAYS}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    [onShowAllCases, onLast30Days]
  );

  return (
    <EuiSuperDatePicker
      data-test-subj="date-range-filter"
      isLoading={isLoading || isLoadingEarliestCase}
      start={filterOptions.from}
      end={filterOptions.to}
      onTimeChange={onTimeChange}
      onRefresh={onRefresh}
      updateButtonProps={{ fill: false }}
      customQuickSelectPanels={customQuickSelectPanels}
      width="auto"
      showUpdateButton={'iconOnly'}
    />
  );
};

DateRangeFilter.displayName = 'DateRangeFilter';
