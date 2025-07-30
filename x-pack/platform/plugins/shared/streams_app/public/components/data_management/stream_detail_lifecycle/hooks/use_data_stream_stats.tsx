/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

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
      const daysSinceCreation = Math.max(
        1,
        Math.round(moment().diff(moment(dsStats.creationDate), 'days'))
      );

      return {
        ...dsStats,
        bytesPerDay:
          dsStats.sizeBytes && dsStats.totalDocs !== 0 ? dsStats.sizeBytes / daysSinceCreation : 0,
        bytesPerDoc:
          dsStats.totalDocs && dsStats.sizeBytes ? dsStats.sizeBytes / dsStats.totalDocs : 0,
      };
    },
    [dataStreamsClient, definition],
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
