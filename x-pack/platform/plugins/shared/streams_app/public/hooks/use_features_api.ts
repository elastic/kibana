/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { type IdentifiedFeatureGenerateResponse, type StreamFeature } from '@kbn/streams-schema';
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

  return {
    upsertFeature: async ({ id, feature }) => {
      await streamsRepositoryClient.fetch(
        'PUT /api/streams/{name}/features/{featureId} 2023-10-31',
        {
          signal,
          params: {
            path: { name, featureId: id },
            body: { feature },
          },
        }
      );
    },
    generate: (connectorId: string) => {
      return streamsRepositoryClient.stream(
        `GET /api/streams/{name}/features/_generate 2023-10-31`,
        {
          signal,
          params: { path: { name }, query: { connectorId } },
        }
      );
    },
  };
}
