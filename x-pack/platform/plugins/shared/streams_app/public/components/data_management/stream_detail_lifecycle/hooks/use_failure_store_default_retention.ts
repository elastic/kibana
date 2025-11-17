/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export function useFailureStoreDefaultRetention(streamName: string) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }) => {
      try {
        const response = await streamsRepositoryClient.fetch(
          'GET /internal/streams/{name}/failure_store/default_retention',
          {
            signal,
            params: {
              path: {
                name: streamName,
              },
            },
          }
        );
        return response.default_retention;
      } catch (error) {
        // If we can't fetch it, just return undefined
        return undefined;
      }
    },
    [streamName, streamsRepositoryClient],
    { disableToastOnError: true }
  );

  return result.value;
}
