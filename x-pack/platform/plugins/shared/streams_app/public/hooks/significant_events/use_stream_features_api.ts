/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../use_kibana';

interface StreamFeaturesApi {
  deleteFeature: (id: string) => Promise<void>;
  deleteFeaturesInBulk: (uuids: string[]) => Promise<void>;
  excludeFeaturesInBulk: (uuids: string[]) => Promise<void>;
  restoreFeaturesInBulk: (uuids: string[]) => Promise<void>;
}

export function useStreamFeaturesApi(streamName: string): StreamFeaturesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      deleteFeature: async (id: string) => {
        await streamsRepositoryClient.fetch('DELETE /internal/streams/{name}/features/{id}', {
          signal,
          params: {
            path: { name: streamName, id },
          },
        });
      },
      deleteFeaturesInBulk: async (ids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              operations: ids.map((id) => ({ delete: { id } })),
            },
          },
        });
      },
      excludeFeaturesInBulk: async (ids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              operations: ids.map((id) => ({ exclude: { id } })),
            },
          },
        });
      },
      restoreFeaturesInBulk: async (ids: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              operations: ids.map((id) => ({ restore: { id } })),
            },
          },
        });
      },
    }),
    [streamsRepositoryClient, signal, streamName]
  );
}
