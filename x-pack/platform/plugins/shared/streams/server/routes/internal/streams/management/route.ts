/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SampleDocument,
  conditionSchema,
  conditionToQueryDsl,
  getFields,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { WrongStreamTypeError } from '../../../../lib/streams/errors/wrong_stream_type_error';
import {
  checkAccess,
  getUnmanagedElasticsearchAssetDetails,
  getUnmanagedElasticsearchAssets,
} from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';
import { DefinitionNotFoundError } from '../../../../lib/streams/errors/definition_not_found_error';

export const sampleStreamRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_sample',
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
              { type: field.type === 'string' ? ('keyword' as const) : ('double' as const) },
            ])
          )
        : undefined,
      sort: [
        {
          '@timestamp': {
            order: 'desc' as const,
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

    return { documents: results.hits.hits.map((hit) => hit._source) as SampleDocument[] };
  },
});

export const unmanagedAssetDetailsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_unmanaged_assets',
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
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.name} not found`);
    }

    const stream = await streamsClient.getStream(params.path.name);

    if (!isUnwiredStreamDefinition(stream)) {
      throw new WrongStreamTypeError(
        `Stream definition for ${params.path.name} is not an unwired stream`
      );
    }

    const dataStream = await streamsClient.getDataStream(params.path.name);

    const assets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient,
    });

    return getUnmanagedElasticsearchAssetDetails({
      assets,
      scopedClusterClient,
    });
  },
});

export const internalManagementRoutes = {
  ...sampleStreamRoute,
  ...unmanagedAssetDetailsRoute,
};
