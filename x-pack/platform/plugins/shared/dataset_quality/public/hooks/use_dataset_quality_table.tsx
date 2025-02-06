/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { orderBy } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import type { Primitive } from '@elastic/eui/src/services/sort/comparators';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD, NONE } from '../../common/constants';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { tableSummaryAllText, tableSummaryOfText } from '../../common/translations';
import { getDatasetQualityTableColumns } from '../components/dataset_quality/table/columns';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';
import { filterInactiveDatasets, isActiveDataset } from '../utils/filter_inactive_datasets';
import { SortDirection } from '../../common/types';

export type DatasetTableSortField = keyof DataStreamStat;

const sortingOverrides: Partial<{
  [key in DatasetTableSortField]: DatasetTableSortField | ((item: DataStreamStat) => Primitive);
}> = {
  ['title']: 'name',
  ['size']: DataStreamStat.calculateFilteredSize,
  ['quality']: (item) => Math.max(item.degradedDocs.percentage, item.failedDocs.percentage),
};

export const useDatasetQualityTable = () => {
  const {
    services: {
      fieldFormats,
      share: { url },
    },
  } = useKibanaContextForPlugin();

  const { service, isFailureStoreEnabled } = useDatasetQualityContext();

  const { page, rowsPerPage, sort } = useSelector(service, (state) => state.context.table);

  const canUserMonitorDataset = useSelector(
    service,
    (state) => state.context.datasetUserPrivileges.canMonitor
  );
  const canUserMonitorAnyDataStream = useSelector(
    service,
    (state) =>
      !state.context.dataStreamStats ||
      state.context.datasets.some((s) => s.userPrivileges?.canMonitor)
  );

  const {
    inactive,
    fullNames: showFullDatasetNames,
    timeRange,
    integrations,
    namespaces,
    qualities,
    query,
  } = useSelector(service, (state) => state.context.filters);
  const showInactiveDatasets = inactive || !canUserMonitorDataset;

  const loading = useSelector(
    service,
    (state) =>
      state.matches('stats.datasets.fetching') ||
      state.matches('stats.docsStats.fetching') ||
      state.matches('integrations.fetching') ||
      state.matches('stats.degradedDocs.fetching') ||
      state.matches('stats.failedDocs.fetching')
  );
  const loadingDataStreamStats = useSelector(service, (state) =>
    state.matches('stats.datasets.fetching')
  );
  const loadingDocStats = useSelector(service, (state) =>
    state.matches('stats.docsStats.fetching')
  );
  const loadingDegradedStats = useSelector(service, (state) =>
    state.matches('stats.degradedDocs.fetching')
  );
  const loadingFailedStats = useSelector(service, (state) =>
    state.matches('stats.failedDocs.fetching')
  );

  const datasets = useSelector(service, (state) => state.context.datasets);

  const toggleInactiveDatasets = useCallback(
    () => service.send({ type: 'TOGGLE_INACTIVE_DATASETS' }),
    [service]
  );

  const toggleFullDatasetNames = useCallback(
    () => service.send({ type: 'TOGGLE_FULL_DATASET_NAMES' }),
    [service]
  );

  const isActive = useCallback(
    (lastActivity: number) => isActiveDataset({ lastActivity, timeRange }),
    [timeRange]
  );

  const columns = useMemo(
    () =>
      getDatasetQualityTableColumns({
        fieldFormats,
        canUserMonitorDataset,
        canUserMonitorAnyDataStream,
        loadingDataStreamStats,
        loadingDocStats,
        loadingDegradedStats,
        loadingFailedStats,
        showFullDatasetNames,
        isActiveDataset: isActive,
        timeRange,
        urlService: url,
        isFailureStoreEnabled,
      }),
    [
      fieldFormats,
      canUserMonitorDataset,
      canUserMonitorAnyDataStream,
      loadingDataStreamStats,
      loadingDocStats,
      loadingDegradedStats,
      loadingFailedStats,
      showFullDatasetNames,
      isActive,
      timeRange,
      url,
      isFailureStoreEnabled,
    ]
  );

  const filteredItems = useMemo(() => {
    const visibleDatasets = showInactiveDatasets
      ? datasets
      : filterInactiveDatasets({ datasets, timeRange });

    return visibleDatasets.filter((dataset) => {
      const passesIntegrationFilter =
        integrations.length === 0 ||
        (!dataset.integration && integrations.includes(NONE)) ||
        (dataset.integration && integrations.includes(dataset.integration.name));

      const passesNamespaceFilter =
        namespaces.length === 0 || namespaces.includes(dataset.namespace);

      const passesQualityFilter = qualities.length === 0 || qualities.includes(dataset.quality);

      const passesQueryFilter = !query || dataset.rawName.includes(query);

      return (
        passesIntegrationFilter && passesNamespaceFilter && passesQualityFilter && passesQueryFilter
      );
    });
  }, [showInactiveDatasets, datasets, timeRange, integrations, namespaces, qualities, query]);

  const pagination = {
    pageIndex: page,
    pageSize: rowsPerPage,
    totalItemCount: filteredItems.length,
    hidePerPageOptions: true,
  };

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: DatasetTableSortField; direction: SortDirection };
    }) => {
      service.send({
        type: 'UPDATE_TABLE_CRITERIA',
        dataset_criteria: {
          page: options.page.index,
          rowsPerPage: options.page.size,
          sort: {
            field: options.sort?.field || DEFAULT_SORT_FIELD,
            direction: options.sort?.direction || DEFAULT_SORT_DIRECTION,
          },
        },
      });
    },
    [service]
  );

  const renderedItems = useMemo(() => {
    const overridenSortingField = sortingOverrides[sort.field] || sort.field;
    const sortedItems = orderBy(filteredItems, overridenSortingField, sort.direction);

    return sortedItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [sort.field, sort.direction, filteredItems, page, rowsPerPage]);

  const resultsCount = useMemo(() => {
    const startNumberItemsOnPage = rowsPerPage * page + (renderedItems.length ? 1 : 0);
    const endNumberItemsOnPage = rowsPerPage * page + renderedItems.length;

    return rowsPerPage === 0 ? (
      <strong>{tableSummaryAllText}</strong>
    ) : (
      <>
        <strong>
          {startNumberItemsOnPage}-{endNumberItemsOnPage}
        </strong>{' '}
        {tableSummaryOfText} {datasets.length}
      </>
    );
  }, [rowsPerPage, page, renderedItems.length, datasets.length]);

  return {
    sort: { sort },
    onTableChange,
    pagination,
    filteredItems,
    renderedItems,
    columns,
    loading,
    resultsCount,
    showInactiveDatasets,
    showFullDatasetNames,
    canUserMonitorDataset,
    canUserMonitorAnyDataStream,
    toggleInactiveDatasets,
    toggleFullDatasetNames,
  };
};
