/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import createContainer from 'constate';
import { countBy } from 'lodash';
import { useDatasetQualityTable } from '.';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import type { QualityIndicators } from '../../common/types';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { filterInactiveDatasets } from '../utils';

const useSummaryPanel = () => {
  const { service } = useDatasetQualityContext();
  const {
    filteredItems,
    canUserMonitorAnyDataset,
    canUserMonitorAnyDataStream,
    loading: isTableLoading,
  } = useDatasetQualityTable();

  const { timeRange } = useSelector(service, (state) => state.context.filters);

  /*
    Datasets Quality
  */

  const datasetsQuality = countBy(filteredItems.map((item) => item.quality)) as Record<
    QualityIndicators,
    number
  >;

  const isDegradedDocsLoading = useSelector(service, (state) =>
    state.matches({ main: { stats: { degradedDocs: 'fetching' } } })
  );
  const isDatasetsQualityLoading = isDegradedDocsLoading || isTableLoading;

  /*
    User Authorization
  */
  const canUserMonitorAllFilteredDataStreams = filteredItems.every(
    (item) => item.userPrivileges?.canMonitor ?? true
  );

  const isUserAuthorizedForDataset = !isTableLoading
    ? canUserMonitorAnyDataset &&
      canUserMonitorAnyDataStream &&
      canUserMonitorAllFilteredDataStreams
    : true;

  /*
    Datasets Activity
  */
  const datasetsActivity = {
    total: filteredItems.length,
    active: filterInactiveDatasets({
      datasets: filteredItems,
      timeRange,
    }).length,
  };

  const isDatasetsActivityLoading = useSelector(service, (state) =>
    state.matches({ main: { stats: { datasets: 'fetching' } } })
  );

  /*
    Estimated Data
  */
  const estimatedData = filteredItems.reduce(
    (acc, curr) => acc + DataStreamStat.calculateFilteredSize(curr),
    0
  );

  const isEstimatedDataLoading = useSelector(
    service,
    (state) =>
      state.matches({ main: { stats: { datasets: 'fetching' } } }) ||
      state.matches({ main: { stats: { degradedDocs: 'fetching' } } })
  );

  return {
    datasetsQuality,
    isDatasetsQualityLoading,

    isUserAuthorizedForDataset,

    isEstimatedDataLoading,
    estimatedData,

    isDatasetsActivityLoading,
    datasetsActivity,

    numberOfDatasets: filteredItems.length,
    numberOfDocuments: filteredItems.reduce((acc, curr) => acc + curr.docsInTimeRange!, 0),
  };
};

const [SummaryPanelProvider, useSummaryPanelContext] = createContainer(useSummaryPanel);

export { useSummaryPanelContext };

// eslint-disable-next-line import/no-default-export
export default SummaryPanelProvider;
