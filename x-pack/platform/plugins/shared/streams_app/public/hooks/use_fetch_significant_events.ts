/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useFetchSignificantEvents = (name?: string) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }) => {
      if (!name) {
        return Promise.resolve(undefined);
      }

      const response = await streamsRepositoryClient.fetch(
        'GET /api/streams/{name}/significant_events 2023-10-31',
        {
          params: {
            path: { name },
            query: {
              from: '2025-03-19T00:00:00.000Z',
              to: '2025-03-21T00:00:00.000Z',
              bucketSize: '1h',
            },
          },
          signal,
        }
      );

      return response;
    },
    [name, streamsRepositoryClient]
  );

  return {
    data: result.value,
    isLoading: result.loading,
  };
};
