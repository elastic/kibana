/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  // EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { DataFrameAnalyticsId, useRefreshAnalyticsList } from '../../../../common';
import { checkPermission } from '../../../../../privilege/check_privilege';
import { getTaskStateBadge } from './columns';

import {
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
  ItemIdToExpandedRowMap,
  DATA_FRAME_TASK_STATE,
  // DATA_FRAME_MODE,
  Query,
  Clause,
} from './common';
import { ActionDispatchers } from '../../hooks/use_create_analytics_form/actions';
import { getAnalyticsFactory } from '../../services/analytics_service';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';
import {
  ProgressBar,
  MlInMemoryTable,
  OnTableChangeArg,
  SortDirection,
  SORT_DIRECTION,
} from '../../../../../components/ml_in_memory_table';

function getItemIdToExpandedRowMap(
  itemIds: DataFrameAnalyticsId[],
  dataFrameAnalytics: DataFrameAnalyticsListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce(
    (m: ItemIdToExpandedRowMap, analyticsId: DataFrameAnalyticsId) => {
      const item = dataFrameAnalytics.find(analytics => analytics.config.id === analyticsId);
      if (item !== undefined) {
        m[analyticsId] = <ExpandedRow item={item} />;
      }
      return m;
    },
    {} as ItemIdToExpandedRowMap
  );
}

function stringMatch(str: string | undefined, substr: string) {
  return (
    typeof str === 'string' &&
    typeof substr === 'string' &&
    (str.toLowerCase().match(substr.toLowerCase()) === null) === false
  );
}

interface Props {
  isManagementTable?: boolean;
  blockRefresh?: boolean;
  openCreateJobModal?: ActionDispatchers['openModal'];
}
// isManagementTable - for use in Kibana managagement ML section
export const DataFrameAnalyticsList: FC<Props> = ({
  isManagementTable = false,
  blockRefresh = false,
  openCreateJobModal,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameAnalyticsId[]>([]);

  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [searchError, setSearchError] = useState<any>(undefined);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameAnalyticsListColumn.id);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  const disabled =
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setErrorMessage,
    setIsInitialized,
    blockRefresh
  );
  // Subscribe to the refresh observable to trigger reloading the analytics list.
  useRefreshAnalyticsList({
    isLoading: setIsLoading,
    onRefresh: () => getAnalytics(true),
  });

  const onQueryChange = ({ query, error }: { query: Query; error: any }) => {
    if (error) {
      setSearchError(error.message);
    } else {
      let clauses: Clause[] = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      if (clauses.length > 0) {
        setFilterActive(true);
        filterAnalytics(clauses);
      } else {
        setFilterActive(false);
      }
      setSearchError(undefined);
    }
  };

  const filterAnalytics = (clauses: Clause[]) => {
    setIsLoading(true);
    // keep count of the number of matches we make as we're looping over the clauses
    // we only want to return analytics which match all clauses, i.e. each search term is ANDed
    // { analytics-one:  { analytics: { id: analytics-one, config: {}, state: {}, ... }, count: 0 }, analytics-two: {...} }
    const matches: Record<string, any> = analytics.reduce((p: Record<string, any>, c) => {
      p[c.id] = {
        analytics: c,
        count: 0,
      };
      return p;
    }, {});

    clauses.forEach(c => {
      // the search term could be negated with a minus, e.g. -bananas
      const bool = c.match === 'must';
      let ts = [];

      if (c.type === 'term') {
        // filter term based clauses, e.g. bananas
        // match on id and description
        // if the term has been negated, AND the matches
        if (bool === true) {
          ts = analytics.filter(
            d => stringMatch(d.id, c.value) === bool // ||
            // stringMatch(d.config.description, c.value) === bool
          );
        } else {
          ts = analytics.filter(
            d => stringMatch(d.id, c.value) === bool // &&
            // stringMatch(d.config.description, c.value) === bool
          );
        }
      } else {
        // filter other clauses, i.e. the mode and status filters
        if (Array.isArray(c.value)) {
          // the status value is an array of string(s) e.g. ['failed', 'stopped']
          ts = analytics.filter(d => c.value.includes(d.stats.state));
        } else {
          ts = analytics.filter(d => d.mode === c.value);
        }
      }

      ts.forEach(t => matches[t.id].count++);
    });

    // loop through the matches and return only analytics which have match all the clauses
    const filtered = Object.values(matches)
      .filter(m => (m && m.count) >= clauses.length)
      .map(m => m.analytics);

    setFilteredAnalytics(filtered);
    setIsLoading(false);
  };

  // Before the analytics have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No data frame analytics found' during the initial loading.
  if (!isInitialized) {
    return <ProgressBar isLoading={isLoading} />;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataFrame.analyticsList.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the data frame analytics list.',
          })}
          color="danger"
          iconType="alert"
        >
          <pre>{JSON.stringify(errorMessage)}</pre>
        </EuiCallOut>
      </Fragment>
    );
  }

  if (analytics.length === 0) {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading} />
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
                defaultMessage: 'No data frame analytics jobs found',
              })}
            </h2>
          }
          actions={
            !isManagementTable && openCreateJobModal !== undefined
              ? [
                  <EuiButtonEmpty onClick={openCreateJobModal} isDisabled={disabled}>
                    {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptButtonText', {
                      defaultMessage: 'Create your first data frame analytics job',
                    })}
                  </EuiButtonEmpty>,
                ]
              : []
          }
          data-test-subj="mlNoDataFrameAnalyticsFound"
        />
      </Fragment>
    );
  }

  const columns = getColumns(expandedRowItemIds, setExpandedRowItemIds, isManagementTable);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, analytics);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: analytics.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const search = {
    onChange: onQueryChange,
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'state.state',
        name: i18n.translate('xpack.ml.dataframe.analyticsList.statusFilter', {
          defaultMessage: 'Status',
        }),
        multiSelect: 'or',
        options: Object.values(DATA_FRAME_TASK_STATE).map(val => ({
          value: val,
          name: val,
          view: getTaskStateBadge(val),
        })),
      },
      // For now analytics jobs are batch only
      /*
      {
        type: 'field_value_selection',
        field: 'mode',
        name: i18n.translate('xpack.ml.dataframe.analyticsList.modeFilter', {
          defaultMessage: 'Mode',
        }),
        multiSelect: false,
        options: Object.values(DATA_FRAME_MODE).map(val => ({
          value: val,
          name: val,
          view: (
            <EuiBadge className="mlTaskModeBadge" color="hollow">
              {val}
            </EuiBadge>
          ),
        })),
      },
      */
    ],
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: DataFrameAnalyticsListColumn.id, direction: SORT_DIRECTION.ASC },
  }: OnTableChangeArg) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  return (
    <Fragment>
      <ProgressBar isLoading={isLoading} />
      <MlInMemoryTable
        allowNeutralSort={false}
        className="mlAnalyticsTable"
        columns={columns}
        error={searchError}
        hasActions={false}
        isExpandable={true}
        isSelectable={false}
        items={filterActive ? filteredAnalytics : analytics}
        itemId={DataFrameAnalyticsListColumn.id}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        search={search}
        data-test-subj="mlDataFramesTableAnalytics"
      />
    </Fragment>
  );
};
