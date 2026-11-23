/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export interface WorkflowExecutionsSearchBarProps {
  dataView: DataView;
  query: Query;
  timeRange: TimeRange;
  filters: Filter[];
  isRefreshPaused: boolean;
  refreshInterval: number;
  onQueryChange: (payload: { query?: Query; dateRange: TimeRange }) => void;
  onQuerySubmit: (payload: { query?: Query; dateRange: TimeRange }) => void;
  onFiltersUpdated: (filters: Filter[]) => void;
  onRefreshChange: (options: { isPaused: boolean; refreshInterval: number }) => void;
}

export const WorkflowExecutionsSearchBar = React.memo<WorkflowExecutionsSearchBarProps>(
  ({
    dataView,
    filters,
    isRefreshPaused,
    onFiltersUpdated,
    onQueryChange,
    onQuerySubmit,
    onRefreshChange,
    query,
    refreshInterval,
    timeRange,
  }) => {
    const {
      unifiedSearch: {
        ui: { SearchBar },
      },
    } = useKibana().services;

    return (
      <div data-test-subj="workflowExecutionsSearchBar">
        <SearchBar
          allowSavingQueries
          appName="workflow_management"
          data-test-subj="workflowExecutionsQueryInput"
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          disableSubscribingToGlobalDataServices
          displayStyle="inPage"
          enableDateRangePicker
          filters={filters}
          indexPatterns={[dataView]}
          isRefreshPaused={isRefreshPaused}
          onFiltersUpdated={onFiltersUpdated}
          onQueryChange={onQueryChange}
          onQuerySubmit={onQuerySubmit}
          onRefreshChange={onRefreshChange}
          placeholder={i18n.translate('workflows.executionsPage.searchPlaceholder', {
            defaultMessage: 'Filter your data using KQL syntax',
          })}
          query={query}
          refreshInterval={refreshInterval}
          showDatePicker
          showFilterBar
          showQueryMenu
          showSubmitButton
          useDefaultBehaviors
        />
      </div>
    );
  }
);
WorkflowExecutionsSearchBar.displayName = 'WorkflowExecutionsSearchBar';
