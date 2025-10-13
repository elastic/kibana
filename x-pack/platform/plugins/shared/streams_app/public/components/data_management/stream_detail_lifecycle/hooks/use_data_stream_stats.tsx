/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import type { CalculatedStats } from './use_calculated_stats';

export type DataStreamStats = DataStreamStatServiceResponse['dataStreamsStats'][number];

// Enhanced type that includes calculated values for backward compatibility
export type EnhancedDataStreamStats = DataStreamStats & CalculatedStats;

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

      return dsStats;
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
