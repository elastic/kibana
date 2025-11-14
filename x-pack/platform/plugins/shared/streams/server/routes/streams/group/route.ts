/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import { Group, Streams } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS } from '@kbn/management-settings-ids';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE } from '../../../lib/streams/assets/fields';
import type { QueryAsset } from '../../../../common/assets';

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
  handler: async ({ params, request, getScopedClients, context }) => {
    const { streamsClient, assetClient, attachmentClient } = await getScopedClients({
      request,
    });

    const core = await context.core;
    const groupStreamsEnabled = await core.uiSettings.client.get(
      OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS
    );

    if (!groupStreamsEnabled) {
      throw badData('Streams are not enabled for Group streams.');
    }

    const { name } = params.path;
    const { group } = params.body;

    const definition = await streamsClient.getStream(name);

    if (!Streams.GroupStream.Definition.is(definition)) {
      throw badData(`Cannot update group capabilities of non-group stream`);
    }

    const [assets, attachments] = await Promise.all([
      assetClient.getAssets(name),
      attachmentClient.getAttachments(name),
    ]);

    const dashboards = attachments
      .filter((attachment) => attachment.type === 'dashboard')
      .map((attachment) => attachment.id);

    const rules = attachments
      .filter((attachment) => attachment.type === 'rule')
      .map((attachment) => attachment.id);

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
      rules,
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
