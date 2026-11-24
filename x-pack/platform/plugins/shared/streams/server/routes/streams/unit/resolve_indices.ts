/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { isNotFoundError } from '@kbn/es-errors';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import {
  isEnabledFailureStore,
  streamsUnitIdentifierSchema,
  type ClassicIngestStreamEffectiveLifecycle,
} from '@kbn/streams-schema';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_RESOLVE_INDEX_PATTERN_LENGTH,
  MAX_RESOLVE_INDEX_PATTERNS,
  collectResolvedDataStreamNames,
  collectResolvedIndexNames,
  type ResolvedDestinationIndex,
  type ResolvedDestinationIndexHealth,
  type ResolveUnitIndicesResponse,
} from '../../../../common';
import { STREAMS_V2_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { getDataStreamLifecycle, getFailureStore } from '../../../lib/streams/stream_crud';
import { processAsyncInChunks } from '../../../utils/process_async_in_chunks';
import { createServerRoute } from '../../create_server_route';

const resolveUnitIndicesParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      id: streamsUnitIdentifierSchema.describe('The unit id.'),
    }),
    query: z
      .object({
        start: z.iso.datetime().describe('Start of the time range, ISO 8601.'),
        end: z.iso.datetime().describe('End of the time range, ISO 8601.'),
      })
      .refine(({ start, end }) => Date.parse(start) < Date.parse(end), {
        message: 'start must be before end',
      }),
  })
);

const assertStreamsCanvasEnabled = async (uiSettingsClient: {
  get: (key: string) => Promise<unknown>;
}) => {
  const canvasEnabled = await uiSettingsClient.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS);

  if (!canvasEnabled) {
    throw notFound('Streams unit API is not enabled.');
  }
};

const toResolvedIndexHealth = (
  status: string | undefined
): ResolvedDestinationIndexHealth | undefined => {
  const health = status?.toLowerCase();
  return health === 'green' || health === 'yellow' || health === 'red' ? health : undefined;
};

const chunkNames = (names: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < names.length; index += MAX_RESOLVE_INDEX_PATTERNS) {
    chunks.push(names.slice(index, index + MAX_RESOLVE_INDEX_PATTERNS));
  }
  return chunks;
};

export const resolveUnitIndicesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/unit/{id}/_resolve_indices',
  options: {
    access: 'internal',
    summary: 'Resolve unit destination indices',
    description:
      'Fetches a Streams unit and returns the Elasticsearch indices each destination wrote documents to in the time range, as its metrics report them.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_V2_API_PRIVILEGES.read],
    },
  },
  params: resolveUnitIndicesParamsSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<ResolveUnitIndicesResponse> => {
    const { unitSoClient, uiSettingsClient, scopedClusterClient, streamsClient, unitStatsClient } =
      await getScopedClients({
        request,
      });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsUnitService = new StreamsUnitService({
      soClient: unitSoClient,
      logger,
    });

    const {
      unit: { destinations },
    } = await streamsUnitService.getUnitOrEmpty(params.path.id);

    // Only a local Elasticsearch destination writes to indices of this cluster.
    const collectionsByDestination = await unitStatsClient.getDestinationCollections({
      unitId: params.path.id,
      destinationIds: destinations.flatMap(({ id, type }) =>
        type === 'elasticsearch' ? [id] : []
      ),
      window: params.query,
    });

    const emptyResponse = (): ResolveUnitIndicesResponse => ({
      destinations: Object.fromEntries(
        destinations.map(({ id: destinationId }) => [destinationId, { indices: [] }])
      ),
    });

    const allNames = [
      ...new Set(
        Object.values(collectionsByDestination)
          .flat()
          .map(({ name }) => name)
          .filter((name) => name.length <= MAX_RESOLVE_INDEX_PATTERN_LENGTH)
      ),
    ];
    if (allNames.length === 0) {
      return emptyResponse();
    }

    // Leaves out a written-to index that was deleted since, or that the user cannot see.
    const resolvedNames = new Set<string>();
    const dataStreamNames = new Set<string>();
    for (const names of chunkNames(allNames)) {
      const resolved = await scopedClusterClient.asCurrentUser.indices.resolveIndex({
        name: names.join(','),
        expand_wildcards: 'open',
        ignore_unavailable: true,
        allow_no_indices: true,
      });
      for (const name of collectResolvedIndexNames(resolved)) {
        resolvedNames.add(name);
      }
      for (const name of collectResolvedDataStreamNames(resolved)) {
        dataStreamNames.add(name);
      }
    }

    const lifecycleByName = new Map<string, ClassicIngestStreamEffectiveLifecycle>();
    const failureStoreEnabledByName = new Map<string, boolean>();
    const healthByName = new Map<string, ResolvedDestinationIndexHealth>();
    const privilegesByName: Record<string, { read_failure_store: boolean }> =
      dataStreamNames.size > 0
        ? await streamsClient.getPrivilegesPerStream([...dataStreamNames])
        : {};

    if (dataStreamNames.size > 0) {
      const dataStreams = await processAsyncInChunks([...dataStreamNames], async (chunk) => {
        if (chunk.length === 0) {
          return { data_streams: [] };
        }
        try {
          return await scopedClusterClient.asCurrentUser.indices.getDataStream({ name: chunk });
        } catch (error) {
          if (isNotFoundError(error)) {
            return { data_streams: [] };
          }
          logger.warn(`Failed to fetch data streams for unit destination indices: ${error}`);
          const message = error instanceof Error ? error.message : String(error);
          for (const name of chunk) {
            lifecycleByName.set(name, { error: { message } });
          }
          return { data_streams: [] };
        }
      });
      for (const dataStream of dataStreams.data_streams) {
        lifecycleByName.set(dataStream.name, getDataStreamLifecycle(dataStream));
        failureStoreEnabledByName.set(
          dataStream.name,
          isEnabledFailureStore(getFailureStore({ dataStream }))
        );
        const health = toResolvedIndexHealth(dataStream.status);
        if (health) {
          healthByName.set(dataStream.name, health);
        }
      }
    }

    const windowSeconds = (Date.parse(params.query.end) - Date.parse(params.query.start)) / 1000;

    return {
      destinations: Object.fromEntries(
        destinations.map(({ id: destinationId }) => [
          destinationId,
          {
            indices: (collectionsByDestination[destinationId] ?? [])
              .filter(({ name }) => resolvedNames.has(name))
              .sort((left, right) => left.name.localeCompare(right.name))
              .map(({ name, documents }): ResolvedDestinationIndex => {
                const writes = {
                  name,
                  documents,
                  ingestion_rate: documents / windowSeconds,
                };
                return dataStreamNames.has(name)
                  ? {
                      ...writes,
                      is_data_stream: true,
                      lifecycle: lifecycleByName.get(name) ?? {
                        error: { message: 'Data stream not found' },
                      },
                      failure_store_enabled: failureStoreEnabledByName.get(name) ?? true,
                      health: healthByName.get(name),
                      privileges: {
                        read_failure_store: privilegesByName[name]?.read_failure_store ?? false,
                      },
                    }
                  : { ...writes, is_data_stream: false };
              }),
          },
        ])
      ),
    };
  },
});
