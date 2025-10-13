/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import type { TimeState } from '@kbn/es-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import type { useAggregations } from './use_ingestion_rate';
import { formatBytes } from '../helpers/format_bytes';

export type DataStreamStats = DataStreamStatServiceResponse['dataStreamsStats'][number] & {
  bytesPerDoc: number;
  bytesPerDay: number;
};

export const useDataStreamStats = ({
  definition,
  timeState,
  aggregations,
}: {
  definition: Streams.ingest.all.GetResponse;
  timeState: TimeState;
  aggregations: ReturnType<typeof useAggregations>['aggregations'];
}) => {
  const {
    services: { dataStreamsClient },
    dependencies: {
      start: {
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
        { stats: fsStats },
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
        return;
      }

      const rangeInDays = moment(timeState.end).diff(moment(timeState.start), 'days', true);

      const countRange = aggregations?.buckets?.reduce((sum, bucket) => sum + bucket.doc_count, 0);

      const sizeBytes = Math.max(0, (dsStats.sizeBytes ?? 0) - (fsStats?.size ?? 0));

      const bytesPerDoc = dsStats.totalDocs && sizeBytes ? sizeBytes / dsStats.totalDocs : 0;
      const perDayDocs = countRange ? countRange / rangeInDays : 0;
      const bytesPerDay = bytesPerDoc * perDayDocs;

      return {
        ...dsStats,
        bytesPerDay,
        bytesPerDoc,
        sizeBytes,
        size: formatBytes(sizeBytes),
      };
    },
    [
      dataStreamsClient,
      definition.stream.name,
      aggregations?.buckets,
      timeState.end,
      timeState.start,
    ],
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
