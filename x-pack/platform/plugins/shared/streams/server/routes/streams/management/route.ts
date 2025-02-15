/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RecursiveRecord,
  conditionSchema,
  conditionToQueryDsl,
  getFields,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { ResyncStreamsResponse } from '../../../lib/streams/client';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';

export const forkStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/_fork',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({ stream: z.object({ name: z.string() }), if: conditionSchema }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    return await streamsClient.forkStream({
      parent: params.path.name,
      if: params.body.if,
      name: params.body.stream.name,
    });
  },
});

export const resyncStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_resync',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<ResyncStreamsResponse> => {
    const { streamsClient } = await getScopedClients({ request });

    return await streamsClient.resyncStreams();
  },
});

export const getStreamsStatusRoute = createServerRoute({
  endpoint: 'GET /api/streams/_status',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['streams_read'],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<{ enabled: boolean }> => {
    const { streamsClient } = await getScopedClients({ request });

    return {
      enabled: await streamsClient.isStreamsEnabled(),
    };
  },
});

export const sampleStreamRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/_sample',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      if: z.optional(conditionSchema),
      start: z.optional(z.number()),
      end: z.optional(z.number()),
      size: z.optional(z.number()),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.name} not found`);
    }

    const { if: condition, start, end, size } = params.body;
    const searchBody = {
      query: {
        bool: {
          must: [
            condition ? conditionToQueryDsl(condition) : { match_all: {} },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      // Conditions could be using fields which are not indexed or they could use it with other types than they are eventually mapped as.
      // Because of this we can't rely on mapped fields to draw a sample, instead we need to use runtime fields to simulate what happens during
      // ingest in the painless condition checks.
      // This is less efficient than it could be - in some cases, these fields _are_ indexed with the right type and we could use them directly.
      // This can be optimized in the future.
      runtime_mappings: condition
        ? Object.fromEntries(
            getFields(condition).map((field) => [
              field.name,
              { type: field.type === 'string' ? 'keyword' : 'double' },
            ])
          )
        : undefined,
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
      terminate_after: size,
      track_total_hits: false,
      size,
    };
    const results = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
      allow_no_indices: true,
      ...searchBody,
    });

    return { documents: results.hits.hits.map((hit) => hit._source) as RecursiveRecord[] };
  },
});

export const managementRoutes = {
  ...forkStreamsRoute,
  ...resyncStreamsRoute,
  ...getStreamsStatusRoute,
  ...sampleStreamRoute,
};
