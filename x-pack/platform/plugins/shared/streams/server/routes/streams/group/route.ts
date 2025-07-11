/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import { Group, Streams } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE, ASSET_UUID } from '../../../lib/streams/assets/fields';
import { QueryAsset } from '../../../../common/assets';

export interface GroupObjectGetResponse {
  group: Streams.GroupStream.Definition['group'];
}

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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  responses: {
    200: {
      description: 'Example Response - TODO: Add at least one response to statisfy OpenAPI Spec',
      body: z.looseObject({}),
      bodyContentType: 'application/json',
    },
  },
  handler: async ({ params, request, getScopedClients }): Promise<GroupObjectGetResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const definition = await streamsClient.getStream(name);

    if (Streams.GroupStream.Definition.is(definition)) {
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      group: Group.right,
    }),
  }),
  responses: {
    200: {
      description: 'Example Response - TODO: Add at least one response to statisfy OpenAPI Spec',
      body: z.looseObject({}),
      bodyContentType: 'application/json',
    },
  },
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, assetClient } = await getScopedClients({
      request,
    });

    if (!(await streamsClient.isStreamsEnabled())) {
      throw badData('Streams are not enabled for Group streams.');
    }

    const { name } = params.path;
    const { group } = params.body;

    const definition = await streamsClient.getStream(name);

    if (!Streams.GroupStream.Definition.is(definition)) {
      throw badData(`Cannot update group capabilities of non-group stream`);
    }

    const assets = await assetClient.getAssets(name);

    const dashboards = assets
      .filter((asset) => asset[ASSET_TYPE] === 'dashboard')
      .map((asset) => asset[ASSET_UUID]);

    const queries = assets
      .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
      .map((asset) => asset.query);

    const { name: _name, ...stream } = definition;

    const upsertRequest: Streams.GroupStream.UpsertRequest = {
      dashboards,
      stream: {
        ...stream,
        group,
      },
      queries,
    };

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
