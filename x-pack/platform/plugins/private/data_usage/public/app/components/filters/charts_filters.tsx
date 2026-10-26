/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperUpdateButton,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';

import { UX_LABELS } from '../../../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { useGetDataUsageMetrics } from '../../../hooks/use_get_usage_metrics';
import { type UsageMetricsDateRangePickerProps, UsageMetricsDateRangePicker } from './date_picker';
import type { ChartsFilterProps } from './charts_filter';
import { ChartsFilter } from './charts_filter';
import type { FilterName } from '../../hooks';

export interface ChartsFiltersProps extends UsageMetricsDateRangePickerProps {
  isUpdateDisabled: boolean;
  isValidDateRange: boolean;
  filterOptions: Record<FilterName, ChartsFilterProps['filterOptions']>;
  onClick: ReturnType<typeof useGetDataUsageMetrics>['refetch'];
  showMetricsTypesFilter?: boolean;
}

export const ChartsFilters = memo<ChartsFiltersProps>(
  ({
    dateRangePickerState,
    isDataLoading,
    isUpdateDisabled,
    isValidDateRange,
    filterOptions,
    onClick,
    onRefresh,
    onRefreshChange,
    onTimeChange,
    showMetricsTypesFilter = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const filters = useMemo(() => {
      return (
        <>
          {showMetricsTypesFilter && (
            <ChartsFilter filterOptions={filterOptions.metricTypes} data-test-subj={dataTestSubj} />
          )}
          {!filterOptions.dataStreams.isFilterLoading && (
            <ChartsFilter filterOptions={filterOptions.dataStreams} data-test-subj={dataTestSubj} />
          )}
        </>
      );
    }, [dataTestSubj, filterOptions, showMetricsTypesFilter]);

    const onClickRefreshButton = useCallback(() => onClick(), [onClick]);

    return (
      <EuiFlexGroup responsive gutterSize="m" justifyContent="flexStart">
        <EuiFlexItem grow={1}>
          <EuiFilterGroup>{filters}</EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <UsageMetricsDateRangePicker
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isDataLoading}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
            data-test-subj={dataTestSubj}
          />
          {!isValidDateRange && (
            <EuiText color="danger" size="s" data-test-subj={getTestId('invalid-date-range')}>
              <EuiTextAlign textAlign="center">
                <p>{UX_LABELS.filters.invalidDateRange}</p>
              </EuiTextAlign>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperUpdateButton
            data-test-subj={getTestId('super-refresh-button')}
            fill={false}
            isLoading={isDataLoading}
            isDisabled={isUpdateDisabled}
            onClick={onClickRefreshButton}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2} />
      </EuiFlexGroup>
    );
  }
);

ChartsFilters.displayName = 'ChartsFilters';
