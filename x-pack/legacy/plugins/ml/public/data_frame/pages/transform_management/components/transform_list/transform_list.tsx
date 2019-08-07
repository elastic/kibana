/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiBadge, EuiButtonEmpty, EuiCallOut, EuiEmptyPrompt, SortDirection } from '@elastic/eui';

import {
  DataFrameTransformId,
  moveToDataFrameWizard,
  useRefreshTransformList,
} from '../../../../common';
import { checkPermission } from '../../../../../privilege/check_privilege';
import { getTaskStateBadge } from './columns';

import {
  DataFrameTransformListColumn,
  DataFrameTransformListRow,
  ItemIdToExpandedRowMap,
  DATA_FRAME_TASK_STATE,
  DATA_FRAME_MODE,
  Query,
  Clause,
} from './common';
import { getTransformsFactory } from '../../services/transform_service';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';
import { ProgressBar, TransformTable } from './transform_table';
import { useRefreshInterval } from './use_refresh_interval';

function getItemIdToExpandedRowMap(
  itemIds: DataFrameTransformId[],
  dataFrameTransforms: DataFrameTransformListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce(
    (m: ItemIdToExpandedRowMap, transformId: DataFrameTransformId) => {
      const item = dataFrameTransforms.find(transform => transform.config.id === transformId);
      if (item !== undefined) {
        m[transformId] = <ExpandedRow item={item} />;
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

export const DataFrameTransformList: SFC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  const [transforms, setTransforms] = useState<DataFrameTransformListRow[]>([]);
  const [filteredTransforms, setFilteredTransforms] = useState<DataFrameTransformListRow[]>([]);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameTransformId[]>([]);

  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [searchError, setSearchError] = useState<any>(undefined);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameTransformListColumn.id);
  const [sortDirection, setSortDirection] = useState<string>(SortDirection.ASC);

  const disabled =
    !checkPermission('canCreateDataFrame') ||
    !checkPermission('canPreviewDataFrame') ||
    !checkPermission('canStartStopDataFrame');

  const getTransforms = getTransformsFactory(
    setTransforms,
    setErrorMessage,
    setIsInitialized,
    blockRefresh
  );
  // Subscribe to the refresh observable to trigger reloading the transform list.
  useRefreshTransformList({
    isLoading: setIsLoading,
    onRefresh: () => getTransforms(true),
  });
  // Call useRefreshInterval() after the subscription above is set up.
  useRefreshInterval(setBlockRefresh);

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
        filterTransforms(clauses);
      } else {
        setFilterActive(false);
      }
      setSearchError(undefined);
    }
  };

  const filterTransforms = (clauses: Clause[]) => {
    setIsLoading(true);
    // keep count of the number of matches we make as we're looping over the clauses
    // we only want to return transforms which match all clauses, i.e. each search term is ANDed
    // { transform-one:  { transform: { id: transform-one, config: {}, state: {}, ... }, count: 0 }, transform-two: {...} }
    const matches: Record<string, any> = transforms.reduce((p: Record<string, any>, c) => {
      p[c.id] = {
        transform: c,
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
          ts = transforms.filter(
            transform =>
              stringMatch(transform.id, c.value) === bool ||
              stringMatch(transform.config.description, c.value) === bool
          );
        } else {
          ts = transforms.filter(
            transform =>
              stringMatch(transform.id, c.value) === bool &&
              stringMatch(transform.config.description, c.value) === bool
          );
        }
      } else {
        // filter other clauses, i.e. the mode and status filters
        if (Array.isArray(c.value)) {
          // the status value is an array of string(s) e.g. ['failed', 'stopped']
          ts = transforms.filter(transform => c.value.includes(transform.stats.task_state));
        } else {
          ts = transforms.filter(transform => transform.config.mode === c.value);
        }
      }

      ts.forEach(t => matches[t.id].count++);
    });

    // loop through the matches and return only transforms which have match all the clauses
    const filtered = Object.values(matches)
      .filter(m => (m && m.count) >= clauses.length)
      .map(m => m.transform);

    setFilteredTransforms(filtered);
    setIsLoading(false);
  };

  // Before the transforms have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No data frame transforms found' during the initial loading.
  if (!isInitialized) {
    return <ProgressBar isLoading={isLoading} />;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataFrame.list.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the data frame transform list.',
          })}
          color="danger"
          iconType="alert"
        >
          <pre>{JSON.stringify(errorMessage)}</pre>
        </EuiCallOut>
      </Fragment>
    );
  }

  if (transforms.length === 0) {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading} />
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.ml.dataFrame.list.emptyPromptTitle', {
                defaultMessage: 'No data frame transforms found',
              })}
            </h2>
          }
          actions={[
            <EuiButtonEmpty onClick={moveToDataFrameWizard} isDisabled={disabled}>
              {i18n.translate('xpack.ml.dataFrame.list.emptyPromptButtonText', {
                defaultMessage: 'Create your first data frame transform',
              })}
            </EuiButtonEmpty>,
          ]}
          data-test-subj="mlNoDataFrameTransformsFound"
        />
      </Fragment>
    );
  }

  const columns = getColumns(expandedRowItemIds, setExpandedRowItemIds);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, transforms);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: transforms.length,
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
        field: 'state.task_state',
        name: i18n.translate('xpack.ml.dataframe.statusFilter', { defaultMessage: 'Status' }),
        multiSelect: 'or',
        options: Object.values(DATA_FRAME_TASK_STATE).map(val => ({
          value: val,
          name: val,
          view: getTaskStateBadge(val),
        })),
      },
      {
        type: 'field_value_selection',
        field: 'config.mode',
        name: i18n.translate('xpack.ml.dataframe.modeFilter', { defaultMessage: 'Mode' }),
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
    ],
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: DataFrameTransformListColumn.id, direction: SortDirection.ASC },
  }: {
    page: { index: number; size: number };
    sort: { field: string; direction: string };
  }) => {
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
      <TransformTable
        className="mlTransformTable"
        columns={columns}
        error={searchError}
        hasActions={false}
        isExpandable={true}
        isSelectable={false}
        items={filterActive ? filteredTransforms : transforms}
        itemId={DataFrameTransformListColumn.id}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        onChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        search={search}
        data-test-subj="mlDataFramesTableTransforms"
      />
    </Fragment>
  );
};
