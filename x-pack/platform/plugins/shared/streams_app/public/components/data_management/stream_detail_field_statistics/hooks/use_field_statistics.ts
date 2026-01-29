/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export interface AggregatedFieldStats {
  name: string;
  any: number;
  inverted_index: {
    terms: number;
    postings: number;
    proximity: number;
    positions: number;
    term_frequencies: number;
    offsets: number;
    payloads: number;
  };
  stored_fields: number;
  doc_values: number;
  points: number;
  norms: number;
  term_vectors: number;
  knn_vectors: number;
}

export interface FieldStatisticsResponse {
  isSupported: boolean;
  fields: AggregatedFieldStats[];
  totalFields: number;
}

export const useFieldStatistics = ({ streamName }: { streamName: string }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const statsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/field_statistics',
        {
          signal,
          params: {
            path: { name: streamName },
          },
        }
      );

      return response as FieldStatisticsResponse;
    },
    [streamsRepositoryClient, streamName],
    {
      withTimeRange: false,
      withRefresh: false,
    }
  );

  return {
    data: statsFetch.value,
    isLoading: statsFetch.loading,
    refresh: statsFetch.refresh,
    error: statsFetch.error,
  };
};
