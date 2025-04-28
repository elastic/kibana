/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import {
  GroupObjectGetResponse,
  groupObjectUpsertRequestSchema,
  GroupStreamUpsertRequest,
  isGroupStreamDefinition,
} from '@kbn/streams-schema';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE, ASSET_UUID } from '../../../lib/streams/assets/fields';
import { QueryAsset } from '../../../../common/assets';

const readGroupRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/_group 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get group stream settings',
    description: 'Fetches the group settings of a group stream definition',
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
  handler: async ({ params, request, getScopedClients }): Promise<GroupObjectGetResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const definition = await streamsClient.getStream(name);

    if (isGroupStreamDefinition(definition)) {
      return { group: definition.group };
    }

    throw badRequest(`Stream is not a group stream`);
  },
});

const upsertGroupRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/_group 2023-10-31',
  options: {
    access: 'public',
    description: 'Upserts the group settings of a group stream definition',
    summary: 'Upsert group stream settings',
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
    body: groupObjectUpsertRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, assetClient } = await getScopedClients({
      request,
    });

    if (!(await streamsClient.isStreamsEnabled())) {
      throw badData('Streams are not enabled for Group streams.');
    }

    const { name } = params.path;
    const assets = await assetClient.getAssets(name);

    const groupUpsertRequest = params.body;

    const dashboards = assets
      .filter((asset) => asset[ASSET_TYPE] === 'dashboard')
      .map((asset) => asset[ASSET_UUID]);

    const queries = assets
      .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
      .map((asset) => asset.query);

    const upsertRequest = {
      dashboards,
      stream: groupUpsertRequest,
      queries,
    } as GroupStreamUpsertRequest;

    return await streamsClient.upsertStream({
      request: upsertRequest,
      name,
    });
  },
});

export const groupRoutes = {
  ...readGroupRoute,
  ...upsertGroupRoute,
};
