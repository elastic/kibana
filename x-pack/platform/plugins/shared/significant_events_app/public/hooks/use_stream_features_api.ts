/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Feature } from '@kbn/significant-events-schema';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

interface StreamFeaturesApi {
  deleteFeaturesInBulk: (uuids: string[]) => Promise<void>;
  excludeFeaturesInBulk: (uuids: string[]) => Promise<void>;
  restoreFeaturesInBulk: (uuids: string[]) => Promise<void>;
  setFeatureDurability: (feature: Feature, expiresAt: string | undefined) => Promise<void>;
}

export function useStreamFeaturesApi(streamName: string): StreamFeaturesApi {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      deleteFeaturesInBulk: async (ids: string[]) => {
        await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/{name}/features/_bulk',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                operations: ids.map((id) => ({ delete: { id } })),
              },
            },
          }
        );
      },
      excludeFeaturesInBulk: async (ids: string[]) => {
        await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/{name}/features/_bulk',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                operations: ids.map((id) => ({ exclude: { id } })),
              },
            },
          }
        );
      },
      restoreFeaturesInBulk: async (ids: string[]) => {
        await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/{name}/features/_bulk',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                operations: ids.map((id) => ({ restore: { id } })),
              },
            },
          }
        );
      },
      setFeatureDurability: async (feature: Feature, expiresAt: string | undefined) => {
        // `uuid` is derived server-side and rejected by the upsert schema; send the upsert shape only.
        const { uuid, ...featureUpsert } = feature;
        await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/{name}/features/_bulk',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                operations: [{ index: { feature: { ...featureUpsert, expires_at: expiresAt } } }],
              },
            },
          }
        );
      },
    }),
    [significantEventsRepositoryClient, signal, streamName]
  );
}
