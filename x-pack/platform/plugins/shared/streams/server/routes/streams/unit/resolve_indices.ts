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
import { z } from '@kbn/zod/v4';
import {
  MAX_RESOLVE_INDEX_PATTERN_LENGTH,
  MAX_RESOLVE_INDEX_PATTERNS,
  collectResolvedDataStreamNames,
  collectResolvedIndexNames,
  getUnitDestinationWritePatterns,
  matchesIndexPattern,
  type ResolvedDestinationIndex,
  type ResolveUnitIndicesResponse,
} from '../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { getDataStreamLifecycle, getFailureStore } from '../../../lib/streams/stream_crud';
import { processAsyncInChunks } from '../../../utils/process_async_in_chunks';
import { createServerRoute } from '../../create_server_route';

const unitPathSchema = z.object({
  path: z.object({
    id: streamsUnitIdentifierSchema.describe('The unit id.'),
  }),
});

const assertStreamsCanvasEnabled = async (uiSettingsClient: {
  get: (key: string) => Promise<unknown>;
}) => {
  const canvasEnabled = await uiSettingsClient.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS);

  if (!canvasEnabled) {
    throw notFound('Streams unit API is not enabled.');
  }
};

const uniquePatterns = (patterns: string[]): string[] => [...new Set(patterns)];

const chunkPatterns = (patterns: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < patterns.length; index += MAX_RESOLVE_INDEX_PATTERNS) {
    chunks.push(patterns.slice(index, index + MAX_RESOLVE_INDEX_PATTERNS));
  }
  return chunks;
};

export const resolveUnitIndicesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/unit/{id}/_resolve_indices',
  options: {
    access: 'internal',
    summary: 'Resolve unit destination indices',
    description:
      'Fetches a Streams unit and returns the Elasticsearch indices each destination can write to.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: unitPathSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<ResolveUnitIndicesResponse> => {
    const { soClient, uiSettingsClient, scopedClusterClient, streamsClient } =
      await getScopedClients({
        request,
      });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsUnitService = new StreamsUnitService({
      soClient,
      logger,
    });

    const {
      unit: { destinations },
    } = await streamsUnitService.getUnitOrEmpty(params.path.id);

    const patternsByDestination = Object.fromEntries(
      destinations.map((destination) => [
        destination.id,
        getUnitDestinationWritePatterns(destination).filter(
          (pattern) => pattern.length <= MAX_RESOLVE_INDEX_PATTERN_LENGTH
        ),
      ])
    );

    const emptyResponse = (): ResolveUnitIndicesResponse => ({
      destinations: Object.fromEntries(
        Object.keys(patternsByDestination).map((destinationId) => [destinationId, { indices: [] }])
      ),
    });

    const allPatterns = uniquePatterns(Object.values(patternsByDestination).flat());
    if (allPatterns.length === 0) {
      return emptyResponse();
    }

    const resolvedNames = new Set<string>();
    const dataStreamNames = new Set<string>();
    for (const patterns of chunkPatterns(allPatterns)) {
      const resolved = await scopedClusterClient.asCurrentUser.indices.resolveIndex({
        name: patterns.join(','),
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

    const names = [...resolvedNames];
    const lifecycleByName = new Map<string, ClassicIngestStreamEffectiveLifecycle>();
    const failureStoreEnabledByName = new Map<string, boolean>();
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
      }
    }

    return {
      destinations: Object.fromEntries(
        Object.entries(patternsByDestination).map(([destinationId, patterns]) => [
          destinationId,
          {
            indices: names
              .filter((name) => patterns.some((pattern) => matchesIndexPattern(name, pattern)))
              .map(
                (name): ResolvedDestinationIndex =>
                  dataStreamNames.has(name)
                    ? {
                        name,
                        is_data_stream: true,
                        lifecycle: lifecycleByName.get(name) ?? {
                          error: { message: 'Data stream not found' },
                        },
                        failure_store_enabled: failureStoreEnabledByName.get(name) ?? true,
                        privileges: {
                          read_failure_store: privilegesByName[name]?.read_failure_store ?? false,
                        },
                      }
                    : { name, is_data_stream: false }
              ),
          },
        ])
      ),
    };
  },
});
