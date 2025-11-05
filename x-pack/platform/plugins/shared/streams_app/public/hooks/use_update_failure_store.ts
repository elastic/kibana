/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

export function useUpdateFailureStore() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal } = useAbortController();

  const updateFailureStore = useCallback(
    async (
      name: string,
      options: { failureStoreEnabled: boolean; customRetentionPeriod?: string }
    ) => {
      const data = await streamsRepositoryClient.fetch(
        'PUT /internal/streams/{name}/_failure_store',
        {
          params: {
            path: { name },
            body: {
              failureStoreEnabled: options.failureStoreEnabled,
              customRetentionPeriod: options.customRetentionPeriod,
            },
          },
          signal,
        }
      );
      return data;
    },
    [streamsRepositoryClient, signal]
  );

  return {
    updateFailureStore,
  };
}
