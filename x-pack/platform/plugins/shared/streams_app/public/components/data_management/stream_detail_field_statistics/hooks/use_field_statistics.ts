/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export interface AggregatedFieldStats {
  /** Field name */
  name: string;
  /** Total disk usage in bytes across all storage types */
  total_in_bytes: number;
  /** Inverted index disk usage in bytes */
  inverted_index_in_bytes: number;
  /** Stored fields disk usage in bytes */
  stored_fields_in_bytes: number;
  /** Doc values disk usage in bytes */
  doc_values_in_bytes: number;
  /** Points (numeric range queries) disk usage in bytes */
  points_in_bytes: number;
  /** Norms disk usage in bytes */
  norms_in_bytes: number;
  /** Term vectors disk usage in bytes */
  term_vectors_in_bytes: number;
  /** KNN vectors disk usage in bytes */
  knn_vectors_in_bytes: number;
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
