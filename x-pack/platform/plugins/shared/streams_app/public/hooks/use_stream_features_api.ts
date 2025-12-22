/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { firstValueFrom } from 'rxjs';
import type { Streams, System } from '@kbn/streams-schema';
import type { IdentifiedSystemsEvent } from '@kbn/streams-plugin/server/routes/internal/streams/systems/types';
import type { StorageClientBulkResponse } from '@kbn/storage-adapter';
import { useKibana } from './use_kibana';

interface StreamFeaturesApi {
  upsertSystem: (system: System) => Promise<void>;
  identifySystems: (connectorId: string) => Promise<IdentifiedSystemsEvent>;
  addSystemsToStream: (systems: System[]) => Promise<StorageClientBulkResponse>;
  removeSystemsFromStream: (systems: Pick<System, 'name'>[]) => Promise<StorageClientBulkResponse>;
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
    identifySystems: async (connectorId: string) => {
      const now = Date.now();
      const events$ = streamsRepositoryClient.stream(
        'POST /internal/streams/{name}/systems/_identify',
        {
          signal,
          params: {
            path: { name: definition.name },
            query: {
              connectorId,
              to: new Date(now).toISOString(),
              from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        }
      );

      const identifiedSystems = await firstValueFrom(events$);

      return identifiedSystems;
    },
    addSystemsToStream: async (systems: System[]) => {
      return await streamsRepositoryClient.fetch('POST /internal/streams/{name}/systems/_bulk', {
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
      });
    },
    removeSystemsFromStream: async (systems: Pick<System, 'name'>[]) => {
      return await streamsRepositoryClient.fetch('POST /internal/streams/{name}/systems/_bulk', {
        signal,
        params: {
          path: {
            name: definition.name,
          },
          body: {
            operations: systems.map((system) => ({
              delete: {
                system: {
                  name: system.name,
                },
              },
            })),
          },
        },
      });
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
    abort: () => {
      abort();
      refresh();
    },
  };
}
