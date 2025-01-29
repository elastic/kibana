/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';
import {
  ANALYSIS_CONFIG_TYPE,
  DATA_FRAME_TASK_STATE,
  type DataFrameAnalyticsId,
} from '@kbn/ml-data-frame-analytics-utils';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import { useRefreshAnalyticsList } from '../../../../common';
import { usePermissionCheck } from '../../../../../capabilities/check_capabilities';
import { useNavigateToPath } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/locator';

import type { DataFrameAnalyticsListRow, ItemIdToExpandedRowMap } from './common';
import { DataFrameAnalyticsListColumn } from './common';
import { useGetAnalytics } from '../../services/analytics_service';
import { getJobTypeBadge, getTaskStateBadge, useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';
import type { AnalyticStatsBarStats } from '../../../../../components/stats_bar';
import { StatsBar } from '../../../../../components/stats_bar';
import { CreateAnalyticsButton } from '../create_analytics_button';
import { filterAnalytics } from '../../../../common/search_bar_filters';
import { AnalyticsEmptyPrompt } from '../empty_prompt';
import { useTableSettings } from './use_table_settings';
import { JobsAwaitingNodeWarning } from '../../../../../components/jobs_awaiting_node_warning';
import { useRefresh } from '../../../../../routing/use_refresh';
import { SpaceManagementContextWrapper } from '../../../../../components/space_management_context_wrapper';

const filters: EuiSearchBarProps['filters'] = [
  {
    type: 'field_value_selection',
    field: 'job_type',
    name: i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
      defaultMessage: 'Type',
    }),
    multiSelect: 'or',
    options: Object.values(ANALYSIS_CONFIG_TYPE).map((val) => ({
      value: val,
      name: val,
      view: getJobTypeBadge(val),
    })),
  },
  {
    type: 'field_value_selection',
    field: 'state',
    name: i18n.translate('xpack.ml.dataframe.analyticsList.statusFilter', {
      defaultMessage: 'Status',
    }),
    multiSelect: 'or',
    options: Object.values(DATA_FRAME_TASK_STATE).map((val) => ({
      value: val,
      name: val,
      view: getTaskStateBadge(val),
    })),
  },
];

function getItemIdToExpandedRowMap(
  itemIds: DataFrameAnalyticsId[],
  dataFrameAnalytics: DataFrameAnalyticsListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, analyticsId: DataFrameAnalyticsId) => {
    const item = dataFrameAnalytics.find((analytics) => analytics.config.id === analyticsId);
    if (item !== undefined) {
      m[analyticsId] = <ExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

interface Props {
  isMlEnabledInSpace?: boolean;
  blockRefresh?: boolean;
  pageState: ListingPageUrlState;
  updatePageState: (update: Partial<ListingPageUrlState>) => void;
}
export const DataFrameAnalyticsList: FC<Props> = ({
  isMlEnabledInSpace = true,
  blockRefresh = false,
  pageState,
  updatePageState,
}) => {
  const navigateToPath = useNavigateToPath();

  const searchQueryText = pageState.queryText ?? '';
  const setSearchQueryText = useCallback(
    (value: string) => {
      updatePageState({ queryText: value });
    },
    [updatePageState]
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [filteredAnalytics, setFilteredAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [searchError, setSearchError] = useState<string | undefined>();
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameAnalyticsId[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [jobsAwaitingNodeCount, setJobsAwaitingNodeCount] = useState(0);

  const refreshObs = useRefresh();

  const [canCreateDataFrameAnalytics, canStartStopDataFrameAnalytics] = usePermissionCheck([
    'canCreateDataFrameAnalytics',
    'canStartStopDataFrameAnalytics',
  ]);

  const disabled = !canCreateDataFrameAnalytics || !canStartStopDataFrameAnalytics;

  const getAnalytics = useGetAnalytics(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    setJobsAwaitingNodeCount,
    blockRefresh
  );

  const updateFilteredItems = useCallback(
    (queryClauses: any[]) => {
      if (queryClauses.length) {
        const filtered = filterAnalytics(analytics, queryClauses);
        setFilteredAnalytics(filtered);
      } else {
        setFilteredAnalytics(analytics);
      }
    },
    [analytics]
  );

  const filterList = () => {
    if (searchQueryText !== '') {
      // trigger table filtering with query for job id to trigger table filter
      const query = EuiSearchBar.Query.parse(searchQueryText);
      let clauses: any = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      updateFilteredItems(clauses);
    } else {
      updateFilteredItems([]);
    }
  };

  useEffect(() => {
    filterList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQueryText]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getAnalyticsCallback = useCallback(() => getAnalytics(true), []);

  // Subscribe to the refresh observable to trigger reloading the analytics list.
  const { refresh } = useRefreshAnalyticsList({
    isLoading: setIsLoading,
    onRefresh: getAnalyticsCallback,
  });

  useEffect(
    function updateOnTimerRefresh() {
      getAnalyticsCallback();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshObs]
  );

  const { columns, modals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    isMlEnabledInSpace,
    refresh
  );

  const { onTableChange, pagination, sorting } = useTableSettings<DataFrameAnalyticsListRow>(
    filteredAnalytics.length,
    pageState,
    updatePageState
  );

  const navigateToSourceSelection = useCallback(async () => {
    await navigateToPath(ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchOnChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
  };

  // Before the analytics have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No data frame analytics found' during the initial loading.
  if (!isInitialized) {
    return null;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataFrame.analyticsList.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the data frame analytics list.',
        })}
        color="danger"
        iconType="warning"
      >
        <pre>{JSON.stringify(errorMessage)}</pre>
      </EuiCallOut>
    );
  }

  if (analytics.length === 0) {
    return (
      <div data-test-subj="mlAnalyticsJobList">
        <EuiSpacer size="m" />
        <AnalyticsEmptyPrompt />
      </div>
    );
  }

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, analytics);

  const stats = analyticsStats && (
    <EuiFlexItem grow={false}>
      <StatsBar stats={analyticsStats} dataTestSub={'mlAnalyticsStatsBar'} />
    </EuiFlexItem>
  );

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: handleSearchOnChange,
    box: {
      incremental: true,
    },
    filters,
  };

  return (
    <SpaceManagementContextWrapper>
      <div data-test-subj="mlAnalyticsJobList">
        {modals}
        <JobsAwaitingNodeWarning jobCount={jobsAwaitingNodeCount} />
        <EuiFlexGroup justifyContent="spaceBetween">
          {stats}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <CreateAnalyticsButton
                  isDisabled={disabled}
                  navigateToSourceSelection={navigateToSourceSelection}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <div data-test-subj="mlAnalyticsTableContainer">
          <EuiInMemoryTable<DataFrameAnalyticsListRow>
            rowHeader={DataFrameAnalyticsListColumn.id}
            allowNeutralSort={false}
            columns={columns}
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            items={analytics}
            itemId={DataFrameAnalyticsListColumn.id}
            loading={isLoading}
            onTableChange={onTableChange}
            pagination={pagination}
            sorting={sorting}
            search={search}
            data-test-subj={isLoading ? 'mlAnalyticsTable loading' : 'mlAnalyticsTable loaded'}
            rowProps={(item) => ({
              'data-test-subj': `mlAnalyticsTableRow row-${item.id}`,
            })}
            error={searchError}
          />
        </div>
      </div>
    </SpaceManagementContextWrapper>
  );
};
