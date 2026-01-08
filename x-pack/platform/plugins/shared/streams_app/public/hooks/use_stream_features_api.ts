/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { Streams, Feature, FeatureType } from '@kbn/streams-schema';
import type { StorageClientBulkResponse } from '@kbn/storage-adapter';
import type { FeatureIdentificationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/features/route';
import { useKibana } from './use_kibana';
import { getStreamTypeFromDefinition } from '../util/get_stream_type_from_definition';

interface StreamFeaturesApi {
  getFeatureIdentificationStatus: () => Promise<FeatureIdentificationTaskResult>;
  scheduleFeatureIdentificationTask: (connectorId: string) => Promise<void>;
  cancelFeatureIdentificationTask: () => Promise<void>;
  acknowledgeFeatureIdentificationTask: () => Promise<void>;
  addFeaturesToStream: (features: Feature[]) => Promise<StorageClientBulkResponse>;
  removeFeaturesFromStream: (
    features: Pick<Feature, 'type' | 'name'>[]
  ) => Promise<StorageClientBulkResponse>;
  upsertFeature: (feature: Feature) => Promise<void>;
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

  const { signal } = useAbortController();

  return {
    getFeatureIdentificationStatus: async () => {
      return await streamsRepositoryClient.fetch('GET /internal/streams/{name}/features/_status', {
        signal,
        params: {
          path: { name: definition.name },
        },
      });
    },
    scheduleFeatureIdentificationTask: async (connectorId: string) => {
      const now = Date.now();
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_task', {
        signal,
        params: {
          path: { name: definition.name },
          body: {
            action: 'schedule',
            to: new Date(now).toISOString(),
            from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
            connectorId,
          },
        },
      });
    },
    cancelFeatureIdentificationTask: async () => {
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_task', {
        signal,
        params: {
          path: { name: definition.name },
          body: {
            action: 'cancel',
          },
        },
      });
    },
    acknowledgeFeatureIdentificationTask: async () => {
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_task', {
        signal,
        params: {
          path: { name: definition.name },
          body: {
            action: 'acknowledge',
          },
        },
      });
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
  };
}
