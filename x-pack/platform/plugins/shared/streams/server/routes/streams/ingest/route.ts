/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badData, badRequest } from '@hapi/boom';
import {
  IngestGetResponse,
  IngestStreamUpsertRequest,
  ingestUpsertRequestSchema,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { createServerRoute } from '../../create_server_route';

const readIngestRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/_ingest 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get ingest stream settings',
    description: 'Fetches the ingest settings of an ingest stream definition',
    availability: {
      stability: 'experimental',
    },
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
  handler: async ({ params, request, getScopedClients }): Promise<IngestGetResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const name = params.path.name;

    const definition = await streamsClient.getStream(name);

    if (isWiredStreamDefinition(definition)) {
      return { ingest: definition.ingest };
    }

    if (isUnwiredStreamDefinition(definition)) {
      return { ingest: definition.ingest };
    }

    throw badRequest(`Stream is not an ingest stream`);
  },
});

const upsertIngestRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/_ingest 2023-10-31',
  options: {
    access: 'public',
    summary: 'Update ingest stream settings',
    description: 'Upserts the ingest settings of an ingest stream definition',
    availability: {
      stability: 'experimental',
    },
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
    body: ingestUpsertRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, assetClient } = await getScopedClients({
      request,
    });

    const name = params.path.name;
    const existingStream = await streamsClient.getStream(name).catch(() => undefined);

    if (
      isWiredStreamDefinition({
        name,
        description: existingStream?.description ?? '',
        ...params.body,
      }) &&
      !(await streamsClient.isStreamsEnabled())
    ) {
      throw badData('Streams are not enabled for Wired streams.');
    }

    const assets = await assetClient.getAssets({
      entityId: name,
      entityType: 'stream',
    });

    const dashboards = assets
      .filter((asset) => asset.assetType === 'dashboard')
      .map((asset) => asset.assetId);

    const upsertRequest = {
      stream: { ...params.body },
      description: existingStream?.description ?? '',
      dashboards,
    } as IngestStreamUpsertRequest;

    return await streamsClient.upsertStream({
      request: upsertRequest,
      name: params.path.name,
    });
  },
});

export const ingestRoutes = {
  ...readIngestRoute,
  ...upsertIngestRoute,
};
