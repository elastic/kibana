/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import {
  isEnabledFailureStore,
  type FailureStoreStatsResponse,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { TimeState } from '@kbn/es-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import type { CalculatedStats } from '../helpers/get_calculated_stats';
import { getCalculatedStats } from '../helpers/get_calculated_stats';
import { getAggregations } from './use_ingestion_rate';
import { formatBytes } from '../helpers/format_bytes';

export type DataStreamStats = DataStreamStatServiceResponse['dataStreamsStats'][number];

export type EnhancedDataStreamStats = DataStreamStats & CalculatedStats;
export type EnhancedFailureStoreStats = FailureStoreStatsResponse & CalculatedStats;

export const useDataStreamStats = ({
  definition,
  timeState,
}: {
  definition: Streams.ingest.all.GetResponse;
  timeState: TimeState;
}) => {
  const {
    core,
    services: { dataStreamsClient },
    dependencies: {
      start: {
        data: { search },
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const statsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const client = await dataStreamsClient;
      const [
        {
          dataStreamsStats: [dsStats],
        },
        failureStore,
      ] = await Promise.all([
        client.getDataStreamsStats({
          datasetQuery: definition.stream.name,
          includeCreationDate: true,
        }),

        streamsRepositoryClient.fetch('GET /internal/streams/{name}/failure_store/stats', {
          signal,
          params: {
            path: { name: definition.stream.name },
          },
        }),
      ]);

      if (!dsStats || !dsStats.creationDate) {
        return undefined;
      }

      const [dsAggregations, fsAggregations] = await Promise.all([
        getAggregations({ definition, timeState, core, search, signal }),
        isEnabledFailureStore(definition.effective_failure_store)
          ? getAggregations({ definition, timeState, core, search, signal, isFailureStore: true })
          : undefined,
      ]);

      const dsSizeWithoutFs = Math.max(
        0,
        (dsStats.sizeBytes ?? 0) - (failureStore?.stats?.size ?? 0)
      );

      return {
        ds: {
          stats: {
            ...dsStats,
            sizeBytes: dsSizeWithoutFs,
            size: formatBytes(dsSizeWithoutFs),
            ...getCalculatedStats({
              stats: {
                creationDate: dsStats.creationDate,
                totalDocs: dsStats.totalDocs,
                sizeBytes: dsSizeWithoutFs,
              },
              timeState,
              buckets: dsAggregations?.buckets,
            }),
          },
          aggregations: dsAggregations,
        },
        fs: {
          stats: failureStore.stats
            ? {
                ...failureStore.stats,
                ...getCalculatedStats({
                  stats: {
                    creationDate: failureStore.stats.creationDate,
                    totalDocs: failureStore.stats.count,
                    sizeBytes: failureStore.stats.size,
                  },
                  timeState,
                  buckets: fsAggregations?.buckets,
                }),
              }
            : undefined,
          aggregations: fsAggregations,
        },
      };
    },
    [dataStreamsClient, definition, streamsRepositoryClient, core, search, timeState],
    {
      withTimeRange: false,
      withRefresh: true,
    }
  );

  return {
    stats: statsFetch.value,
    isLoading: statsFetch.loading,
    refresh: statsFetch.refresh,
    error: statsFetch.error,
  };
};
