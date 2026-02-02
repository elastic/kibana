/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { omit } from 'lodash';
import { useKibana } from './use_kibana';

export function useUpdateFailureStore(definition: Streams.ingest.all.Definition) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal } = useAbortController();

  const updateFailureStore = useCallback(
    async (name: string, failureStore: FailureStore) => {
      const data = await streamsRepositoryClient.fetch(
        'PUT /api/streams/{name}/_ingest 2023-10-31',
        {
          params: {
            path: { name },
            body: {
              ingest: {
                ...definition.ingest,
                processing: omit(definition.ingest.processing, ['updated_at']),
                failure_store: failureStore,
              },
            },
          },
          signal,
        }
      );
      return data;
    },
    [streamsRepositoryClient, definition.ingest, signal]
  );

  return {
    updateFailureStore,
  };
}
