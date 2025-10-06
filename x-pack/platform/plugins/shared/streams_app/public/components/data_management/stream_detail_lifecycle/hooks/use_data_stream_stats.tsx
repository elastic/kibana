/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useAggregations } from './use_ingestion_rate';

export type DataStreamStats = DataStreamStatServiceResponse['dataStreamsStats'][number] & {
  bytesPerDoc: number;
  bytesPerDay: number;
};

export const useDataStreamStats = ({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) => {
  const {
    services: { dataStreamsClient },
  } = useKibana();
  const { timeState } = useTimefilter();
  const { aggregations } = useAggregations({
    definition,
    timeState,
    isFailureStore: false,
  });

  const statsFetch = useStreamsAppFetch(
    async () => {
      const client = await dataStreamsClient;
      const {
        dataStreamsStats: [dsStats],
      } = await client.getDataStreamsStats({
        datasetQuery: definition.stream.name,
        includeCreationDate: true,
      });

      if (!dsStats || !dsStats.creationDate) {
        return undefined;
      }

      const rangeInDays = Math.max(
        1,
        Math.round(moment(timeState.end).diff(moment(timeState.start), 'days'))
      );

      const countRange = aggregations?.buckets?.reduce((sum, bucket) => sum + bucket.doc_count, 0);

      const bytesPerDoc =
        dsStats.totalDocs && dsStats.sizeBytes ? dsStats.sizeBytes / dsStats.totalDocs : 0;
      const perDayDocs = countRange ? countRange / rangeInDays : 0;
      const bytesPerDay = bytesPerDoc * perDayDocs;

      return {
        ...dsStats,
        bytesPerDay,
        bytesPerDoc,
      };
    },
    [dataStreamsClient, definition, aggregations?.buckets, timeState.end, timeState.start],
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
