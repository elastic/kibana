/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAbortController } from '@kbn/react-hooks';
import { Streams } from '@kbn/streams-schema';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';

export const useUpdateStreams = (name: string) => {
  const { signal } = useAbortController();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useCallback(
    async (request: Streams.all.UpsertRequest) => {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name} 2023-10-31', {
        signal,
        params: {
          path: {
            name,
          },
          body: request,
        },
      });
    },
    [name, signal, streamsRepositoryClient]
  );
};
