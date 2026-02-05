/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useDatasetQualityFilters } from './use_dataset_quality_filters';
import type { DataStreamStat } from '../../common/data_streams_stats';
import type { DatasetEbtProps, DatasetNavigatedEbtProps } from '../services/telemetry';
import { NavigationSource, NavigationTarget } from '../services/telemetry';
import { getSafeDateISORange } from '../utils';

export function useDatasetTelemetry() {
  const { service, telemetryClient } = useDatasetQualityContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const datasets = useSelector(service, (state) => state.context.datasets) ?? {};
  const nonAggregatableDatasets = useSelector(
    service,
    (state) => state.context.nonAggregatableDatasets
  );
  const canUserViewIntegrations = useSelector(
    service,
    (state) => state.context.datasetUserPrivileges.canViewIntegrations
  );
  const sort = useSelector(service, (state) => state.context.table.sort);
  const appliedFilters = useDatasetQualityFilters();

  const trackDatasetNavigated = useCallback<(rawName: string, isIgnoredFilter: boolean) => void>(
    (rawName: string, isIgnoredFilter: boolean) => {
      const foundDataset = datasets.find((dataset) => dataset.rawName === rawName);
      if (foundDataset) {
        const ebtProps = getDatasetEbtProps(
          foundDataset,
          sort,
          appliedFilters,
          nonAggregatableDatasets,
          isIgnoredFilter,
          canUserViewIntegrations
        );
        // Skip telemetry if date range is invalid
        if (ebtProps) {
          telemetryClient.trackDatasetNavigated(ebtProps);
        }
      } else {
        throw new Error(
          `Cannot report dataset navigation telemetry for unknown dataset ${rawName}`
        );
      }
    },
    [
      sort,
      appliedFilters,
      canUserViewIntegrations,
      datasets,
      nonAggregatableDatasets,
      telemetryClient,
    ]
  );

  return { trackDatasetNavigated };
}

function getDatasetEbtProps(
  dataset: DataStreamStat,
  sort: { field: string; direction: 'asc' | 'desc' },
  filters: ReturnType<typeof useDatasetQualityFilters>,
  nonAggregatableDatasets: string[],
  isIgnoredFilter: boolean,
  canUserViewIntegrations: boolean
): DatasetNavigatedEbtProps | undefined {
  const dateRange = getSafeDateISORange(filters.timeRange);
  if (!dateRange) {
    // Return undefined when date range is invalid - telemetry should not crash the UI
    return undefined;
  }
  const { startDate: from, endDate: to } = dateRange;
  const datasetEbtProps: DatasetEbtProps = {
    index_name: dataset.rawName,
    data_stream: {
      dataset: dataset.name,
      namespace: dataset.namespace,
      type: dataset.type,
    },
    data_stream_health: dataset.quality,
    data_stream_aggregatable: nonAggregatableDatasets.some(
      (indexName) => indexName === dataset.rawName
    ),
    from,
    to,
    degraded_percentage: dataset.degradedDocs.percentage,
    integration: dataset.integration?.name,
    privileges: {
      can_monitor_data_stream: dataset.userPrivileges?.canMonitor ?? true,
      can_view_integrations: canUserViewIntegrations,
    },
  };

  const ebtFilters: DatasetNavigatedEbtProps['filters'] = {
    is_degraded: isIgnoredFilter,
    query_length: filters.selectedQuery?.length ?? 0,
    integrations: {
      total: filters.integrations.filter((item) => item.name !== 'none').length,
      included: filters.integrations.filter((item) => item?.checked === 'on').length,
      excluded: filters.integrations.filter((item) => item?.checked === 'off').length,
    },
    namespaces: {
      total: filters.namespaces.length,
      included: filters.namespaces.filter((item) => item?.checked === 'on').length,
      excluded: filters.namespaces.filter((item) => item?.checked === 'off').length,
    },
    qualities: {
      total: filters.qualities.length,
      included: filters.qualities.filter((item) => item?.checked === 'on').length,
      excluded: filters.qualities.filter((item) => item?.checked === 'off').length,
    },
  };

  return {
    ...datasetEbtProps,
    sort,
    filters: ebtFilters,
    target: NavigationTarget.Discover,
    source: NavigationSource.Table,
  };
}
