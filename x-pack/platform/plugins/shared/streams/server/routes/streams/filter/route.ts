/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import {
  FilterObjectGetResponse,
  filterObjectUpsertRequestSchema,
  FilterStreamUpsertRequest,
  isFilterStreamDefinition,
} from '@kbn/streams-schema';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE, ASSET_UUID } from '../../../lib/streams/assets/fields';
import { QueryAsset } from '../../../../common/assets';

const readFilterRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/_filter 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get filter stream settings',
    description: 'Fetches the settings of a filter stream definition',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions',
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<FilterObjectGetResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const definition = await streamsClient.getStream(name);

    if (isFilterStreamDefinition(definition)) {
      return { filter: definition.filter };
    }

    throw badRequest(`Stream is not a group stream`);
  },
});

const upsertFilterRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/_filter 2023-10-31',
  options: {
    access: 'public',
    description: 'Upserts the settings of a filter stream definition',
    summary: 'Upsert filter stream settings',
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
    body: filterObjectUpsertRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, assetClient } = await getScopedClients({
      request,
    });

    if (!(await streamsClient.isStreamsEnabled())) {
      throw badData('Streams are not enabled for Filter streams.');
    }

    const { name } = params.path;
    const assets = await assetClient.getAssets(name);

    const filterUpsertRequest = params.body;

    const dashboards = assets
      .filter((asset) => asset[ASSET_TYPE] === 'dashboard')
      .map((asset) => asset[ASSET_UUID]);

    const queries = assets
      .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
      .map((asset) => asset.query);

    const upsertRequest = {
      dashboards,
      stream: filterUpsertRequest,
      queries,
    } as FilterStreamUpsertRequest;

    return await streamsClient.upsertStream({
      request: upsertRequest,
      name,
    });
  },
});

export const filterRoutes = {
  ...readFilterRoute,
  ...upsertFilterRoute,
};
