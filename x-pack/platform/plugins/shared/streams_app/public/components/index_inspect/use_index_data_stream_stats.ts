/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeState } from '@kbn/es-query';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { getCalculatedStats } from '../stream_management/data_management/stream_detail_lifecycle/helpers/get_calculated_stats';
import type { EnhancedDataStreamStats } from '../stream_management/data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { getAggregations } from '../stream_management/data_management/stream_detail_lifecycle/hooks/use_ingestion_rate';

/** Data-stream storage and ingest stats by index name */
export const useIndexDataStreamStats = (indexName: string, timeState: TimeState) => {
  const {
    core,
    services: { dataStreamsClient },
    dependencies: {
      start: {
        data: { search },
      },
    },
  } = useKibana();

  return useStreamsAppFetch(
    async ({ signal }) => {
      const client = await dataStreamsClient;
      const {
        dataStreamsStats: [dsStats],
      } = await client.getDataStreamsStats({
        datasetQuery: indexName,
        includeCreationDate: true,
      });

      if (!dsStats) {
        return undefined;
      }

      const aggregations = await getAggregations({
        indexName,
        timeState,
        core,
        search,
        signal,
      });

      const stats: EnhancedDataStreamStats = {
        ...dsStats,
        ...getCalculatedStats({
          stats: {
            creationDate: dsStats.creationDate,
            totalDocs: dsStats.totalDocs,
            sizeBytes: dsStats.sizeBytes,
          },
          timeState,
          buckets: aggregations?.buckets,
        }),
      };

      return {
        stats,
        aggregations,
      };
    },
    [core, dataStreamsClient, indexName, search, timeState],
    {
      withTimeRange: false,
      withRefresh: true,
    }
  );
};
