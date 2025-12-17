/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { Streams, Feature, FeatureType } from '@kbn/streams-schema';
import type { StorageClientBulkResponse } from '@kbn/storage-adapter';
import type { IdentifyFeaturesResult } from '@kbn/streams-plugin/server/lib/streams/feature/feature_type_registry';
import { useKibana } from './use_kibana';
import { getStreamTypeFromDefinition } from '../util/get_stream_type_from_definition';

interface StreamFeaturesApi {
  upsertFeature: (feature: Feature) => Promise<void>;
  identifyFeatures: (connectorId: string) => Promise<IdentifyFeaturesResult>;
  addFeaturesToStream: (features: Feature[]) => Promise<StorageClientBulkResponse>;
  removeFeaturesFromStream: (
    features: Pick<Feature, 'type' | 'name'>[]
  ) => Promise<StorageClientBulkResponse>;
  abort: () => void;
}

export function useStreamFeaturesApi(definition: Streams.all.Definition): StreamFeaturesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    services: { telemetryClient },
  } = useKibana();

  const { signal, abort, refresh } = useAbortController();

  return {
    identifyFeatures: async (connectorId: string) => {
      // Timeout after 5 minutes
      const pollInterval = 5_000;
      const maxAttempts = 60;

      let attempts = 0;

      while (attempts < maxAttempts) {
        if (signal.aborted) {
          throw new Error('Request aborted');
        }

        const now = Date.now();
        const taskResult = await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/features/_identify',
          {
            signal,
            params: {
              path: { name: definition.name },
              query: {
                connectorId,
                to: new Date(now).toISOString(),
                from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
                schedule: attempts === 0 ? true : false,
              },
            },
          }
        );

        // Check if task is complete
        // Adjust these status checks based on your actual response structure
        if (taskResult.status === 'completed') {
          return taskResult;
        } else if (taskResult.status === 'failed') {
          throw new Error(`Feature identification failed: ${taskResult.error}`);
        } else if (taskResult.status === 'stale') {
          throw new Error('Feature identification task is stale');
        }

        // Task still in progress, wait before polling again
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      throw new Error('Failed to load identified features within the expected time frame');
    },
    addFeaturesToStream: async (features: Feature[]) => {
      telemetryClient.trackFeaturesSaved({
        count: features.length,
        count_by_type: features.reduce<Record<FeatureType, number>>(
          (acc, feature) => {
            acc[feature.type] = (acc[feature.type] || 0) + 1;
            return acc;
          },
          {
            system: 0,
          }
        ),
        stream_name: definition.name,
        stream_type: getStreamTypeFromDefinition(definition),
      });

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
    removeFeaturesFromStream: async (features: Pick<Feature, 'type' | 'name'>[]) => {
      telemetryClient.trackFeaturesDeleted({
        count: features.length,
        count_by_type: features.reduce<Record<FeatureType, number>>(
          (acc, feature) => {
            acc[feature.type] = (acc[feature.type] || 0) + 1;
            return acc;
          },
          {
            system: 0,
          }
        ),
        stream_name: definition.name,
        stream_type: getStreamTypeFromDefinition(definition),
      });

      return await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_bulk', {
        signal,
        params: {
          path: {
            name: definition.name,
          },
          body: {
            operations: features.map((feature) => ({
              delete: {
                feature: {
                  type: feature.type,
                  name: feature.name,
                },
              },
            })),
          },
        },
      });
    },
    upsertFeature: async (feature) => {
      await streamsRepositoryClient.fetch(
        'PUT /internal/streams/{name}/features/{featureType}/{featureName}',
        {
          signal,
          params: {
            path: {
              name: definition.name,
              featureType: feature.type,
              featureName: feature.name,
            },
            body: feature,
          },
        }
      );
    },
    abort: () => {
      abort();
      refresh();
    },
  };
}
