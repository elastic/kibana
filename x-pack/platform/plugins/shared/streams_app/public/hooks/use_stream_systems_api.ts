/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { Streams, System } from '@kbn/streams-schema';
import type { StorageClientBulkResponse } from '@kbn/storage-adapter';
import type { SystemIdentificationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/systems/route';
import { useKibana } from './use_kibana';
import { getStreamTypeFromDefinition } from '../util/get_stream_type_from_definition';

interface StreamSystemsApi {
  getSystemIdentificationStatus: () => Promise<SystemIdentificationTaskResult>;
  scheduleSystemIdentificationTask: (connectorId: string) => Promise<void>;
  cancelSystemIdentificationTask: () => Promise<void>;
  acknowledgeSystemIdentificationTask: () => Promise<void>;
  addSystemsToStream: (systems: System[]) => Promise<StorageClientBulkResponse>;
  removeSystemsFromStream: (systems: Pick<System, 'name'>[]) => Promise<StorageClientBulkResponse>;
  upsertSystem: (system: System) => Promise<void>;
}

export function useStreamSystemsApi(definition: Streams.all.Definition): StreamSystemsApi {
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
    getSystemIdentificationStatus: async () => {
      return await streamsRepositoryClient.fetch('GET /internal/streams/{name}/systems/_status', {
        signal,
        params: {
          path: { name: definition.name },
        },
      });
    },
    scheduleSystemIdentificationTask: async (connectorId: string) => {
      const now = Date.now();
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/systems/_task', {
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
    cancelSystemIdentificationTask: async () => {
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/systems/_task', {
        signal,
        params: {
          path: { name: definition.name },
          body: {
            action: 'cancel',
          },
        },
      });
    },
    acknowledgeSystemIdentificationTask: async () => {
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/systems/_task', {
        signal,
        params: {
          path: { name: definition.name },
          body: {
            action: 'acknowledge',
          },
        },
      });
    },
    addSystemsToStream: async (systems: System[]) => {
      const response = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/systems/_bulk',
        {
          signal,
          params: {
            path: {
              name: definition.name,
            },
            body: {
              operations: systems.map((system) => ({
                index: { system },
              })),
            },
          },
        }
      );

      telemetryClient.trackFeaturesSaved({
        count: systems.length,
        stream_name: definition.name,
        stream_type: getStreamTypeFromDefinition(definition),
      });

      return response;
    },
    removeSystemsFromStream: async (systems: Pick<System, 'name'>[]) => {
      const response = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/systems/_bulk',
        {
          signal,
          params: {
            path: {
              name: definition.name,
            },
            body: {
              operations: systems.map((system) => ({
                delete: { system: { name: system.name } },
              })),
            },
          },
        }
      );

      telemetryClient.trackFeaturesDeleted({
        count: systems.length,
        stream_name: definition.name,
        stream_type: getStreamTypeFromDefinition(definition),
      });

      return response;
    },
    upsertSystem: async (system: System) => {
      await streamsRepositoryClient.fetch('PUT /internal/streams/{name}/systems/{systemName}', {
        signal,
        params: {
          path: {
            name: definition.name,
            systemName: system.name,
          },
          body: system,
        },
      });
    },
  };
}
