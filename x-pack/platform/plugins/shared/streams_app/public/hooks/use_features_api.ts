/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { type IdentifiedFeatureGenerateResponse, type StreamFeature } from '@kbn/streams-schema';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';

interface FeaturesApi {
  upsertFeature: (feature: StreamFeature) => Promise<void>;
  generate: (connectorId: string) => IdentifiedFeatureGenerateResponse;
}

export function useFeaturesApi({ name }: { name: string }): FeaturesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  const upsertFeature = useCallback(
    async (feature: StreamFeature) => {
      await streamsRepositoryClient.fetch(
        'PUT /api/streams/{name}/features/{featureId} 2023-10-31',
        {
          signal,
          params: {
            path: { name, featureId: feature.id },
            body: { feature: feature.feature },
          },
        }
      );
    },
    [name, streamsRepositoryClient, signal]
  );

  const generate = useCallback(
    (connectorId: string) => {
      return streamsRepositoryClient.stream(
        `GET /api/streams/{name}/features/_generate 2023-10-31`,
        {
          signal,
          params: { path: { name }, query: { connectorId } },
        }
      );
    },
    [name, streamsRepositoryClient, signal]
  );

  return {
    upsertFeature,
    generate,
  };
}
