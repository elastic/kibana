/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { isNotFoundError } from '@kbn/es-errors';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import type { ElasticsearchClient } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import type { IndexMetadataResponse } from '../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { getDataStreamLifecycle, getFailureStore } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';

/** Elasticsearch caps index and data stream names at 255 bytes. */
const MAX_INDEX_NAME_LENGTH = 255;

/**
 * A single concrete name: no wildcards, lists, exclusions (`-` prefix), date math (`<...>`),
 * `_all`-style expressions (`_` prefix), or other characters Elasticsearch forbids in names.
 */
const CONCRETE_INDEX_NAME_PATTERN = /^(?![-_+])[^*?,\s"<>|\\/#:]+$/;

const privilegesFrom = (privileges: { read_failure_store: boolean; monitor: boolean }) => ({
  read_failure_store: privileges.read_failure_store,
  monitor: privileges.monitor,
});

const regularIndexExists = async (client: ElasticsearchClient, name: string): Promise<boolean> => {
  try {
    const indices = await client.indices.get({
      index: name,
      ignore_unavailable: true,
    });
    return Object.hasOwn(indices, name);
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

export const indexMetadataRoute = createServerRoute({
  endpoint: 'GET /internal/streams/indices/{name}',
  options: {
    access: 'internal',
    summary: 'Get index metadata',
    description:
      'Returns whether a data stream or index exists, plus data stream lifecycle, failure store and privileges.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z
        .string()
        .min(1)
        .max(MAX_INDEX_NAME_LENGTH)
        .regex(CONCRETE_INDEX_NAME_PATTERN, 'Must be a single index or data stream name.'),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<IndexMetadataResponse> => {
    const { scopedClusterClient, streamsClient, uiSettingsClient } = await getScopedClients({
      request,
    });

    const canvasEnabled = await uiSettingsClient.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS);

    if (!canvasEnabled) {
      throw notFound('Streams unit API is not enabled.');
    }

    const { name } = params.path;
    const privileges = privilegesFrom(await streamsClient.getPrivileges(name));
    const client = scopedClusterClient.asCurrentUser;

    try {
      const { data_streams: dataStreams } = await client.indices.getDataStream({ name });
      const dataStream = dataStreams.find((candidate) => candidate.name === name);
      if (dataStream) {
        return {
          name,
          exists: true,
          is_data_stream: true,
          lifecycle: getDataStreamLifecycle(dataStream),
          effective_failure_store: getFailureStore({ dataStream }),
          privileges,
        };
      }
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    return {
      name,
      exists: await regularIndexExists(client, name),
      is_data_stream: false,
      privileges,
    };
  },
});
