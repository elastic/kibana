/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { firstValueFrom } from 'rxjs';
import type { Streams, Feature } from '@kbn/streams-schema';
import type { IdentifiedFeaturesEvent } from '@kbn/streams-plugin/server/routes/internal/streams/features/types';
import type { StorageClientBulkResponse } from '@kbn/storage-adapter';
import { useKibana } from './use_kibana';

interface StreamFeaturesApi {
  upsertQuery: (
    featureName: string,
    request: Pick<Feature, 'filter' | 'description'>
  ) => Promise<void>;
  identifyFeatures: (
    connectorId: string,
    to: string,
    from: string
  ) => Promise<IdentifiedFeaturesEvent>;
  addFeaturesToStream: (features: Feature[]) => Promise<StorageClientBulkResponse>;
  removeFeaturesFromStream: (featureNames: string[]) => Promise<StorageClientBulkResponse>;
  abort: () => void;
}

export function useStreamFeaturesApi(definition: Streams.all.Definition): StreamFeaturesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal, abort, refresh } = useAbortController();

  return {
    identifyFeatures: async (connectorId: string, to: string, from: string) => {
      const events$ = streamsRepositoryClient.stream(
        'POST /internal/streams/{name}/features/_identify',
        {
          signal,
          params: {
            path: { name: definition.name },
            query: {
              connectorId,
              to,
              from,
            },
          },
        }
      );

      return firstValueFrom(events$);
    },
    addFeaturesToStream: async (features: Feature[]) => {
      return await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
        signal,
        params: {
          path: {
            name: definition.name,
          },
          body: {
            operations: features.map((feature) => ({
              index: {
                feature,
              },
            })),
          },
        },
      });
    },
    removeFeaturesFromStream: async (featureNames: string[]) => {
      return await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
        signal,
        params: {
          path: {
            name: definition.name,
          },
          body: {
            operations: featureNames.map((feature) => ({
              delete: {
                feature: {
                  name: feature,
                },
              },
            })),
          },
        },
      });
    },
    upsertQuery: async (featureName, request) => {
      await streamsRepositoryClient.fetch('PUT /internal/streams/{name}/features/{featureName}', {
        signal,
        params: {
          path: {
            name: definition.name,
            featureName,
          },
          body: request,
        },
      });
    },
    abort: () => {
      abort();
      refresh();
    },
  };
}
