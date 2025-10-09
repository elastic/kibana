/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { Streams, System } from '@kbn/streams-schema';
import type { IdentifiedSystemsEvent } from '@kbn/streams-plugin/server/routes/internal/streams/systems/types';
import type { StorageClientBulkResponse } from '@kbn/storage-adapter';
import { useKibana } from './use_kibana';

interface StreamSystemsApi {
  upsertQuery: (
    systemName: string,
    request: Pick<System, 'filter' | 'description'>
  ) => Promise<void>;
  identifySystems: (
    connectorId: string,
    to: string,
    from: string
  ) => Promise<IdentifiedSystemsEvent>;
  addSystemsToStream: (systems: System[]) => Promise<StorageClientBulkResponse>;
  removeSystemsFromStream: (systemNames: string[]) => Promise<StorageClientBulkResponse>;
}

export function useStreamSystemsApi(definition: Streams.all.Definition): StreamSystemsApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return {
    identifySystems: async (connectorId: string, to: string, from: string) => {
      return await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/systems/_identify',
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
              index: {
                system,
              },
            })),
          },
        },
      });
    },
    removeSystemsFromStream: async (systemNames: string[]) => {
      return await streamsRepositoryClient.fetch('POST /internal/streams/{name}/systems/_bulk', {
        signal,
        params: {
          path: {
            name: definition.name,
          },
          body: {
            operations: systemNames.map((system) => ({
              delete: {
                system: {
                  name: system,
                },
              },
            })),
          },
        },
      });
    },
    upsertQuery: async (systemName, request) => {
      await streamsRepositoryClient.fetch('PUT /internal/streams/{name}/systems/{systemName}', {
        signal,
        params: {
          path: {
            name: definition.name,
            systemName,
          },
          body: request,
        },
      });
    },
  };
}
