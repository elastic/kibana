/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { Streams, System } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';

interface StreamSystemsApi {
  upsertQuery: (
    systemName: string,
    request: Pick<System, 'filter' | 'description'>
  ) => Promise<void>;
}

export function useStreamSystemsApi(
  definition: Streams.ClassicStream.GetResponse
): StreamSystemsApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return {
    upsertQuery: async (systemName, request) => {
      await streamsRepositoryClient.fetch('PUT /internal/streams/{name}/systems/{systemName}', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
            systemName,
          },
          body: request,
        },
      });
    },
  };
}
