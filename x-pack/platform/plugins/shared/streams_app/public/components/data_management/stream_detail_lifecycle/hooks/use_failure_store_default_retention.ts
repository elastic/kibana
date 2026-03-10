/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export function useFailureStoreDefaultRetention(shouldFetch: boolean) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }) => {
      if (!shouldFetch) {
        return undefined;
      }

      try {
        const response = await streamsRepositoryClient.fetch(
          'GET /internal/streams/failure_store/default_retention',
          {
            signal,
          }
        );
        return response.default_retention;
      } catch (error) {
        return undefined;
      }
    },
    [streamsRepositoryClient, shouldFetch],
    { disableToastOnError: true }
  );

  return { clusterDefaultRetention: result.value };
}
