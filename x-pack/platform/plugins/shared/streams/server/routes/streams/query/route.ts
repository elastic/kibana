/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import { Query, Streams } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS } from '@kbn/management-settings-ids';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE, ASSET_UUID } from '../../../lib/streams/assets/fields';
import type { QueryAsset } from '../../../../common/assets';

export interface QueryStreamObjectGetResponse {
  query: Streams.QueryStream.Definition['query'];
}

const readQueryStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/_query 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get query stream settings',
    description: 'Fetches the query settings of a query stream definition',
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
  handler: async ({ params, request, getScopedClients }): Promise<QueryStreamObjectGetResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const definition = await streamsClient.getStream(name);

    if (Streams.QueryStream.Definition.is(definition)) {
      return { query: definition.query };
    }

    throw badRequest(`Stream is not a query stream`);
  },
});

const upsertQueryStreamRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/_query 2023-10-31',
  options: {
    access: 'public',
    description: 'Upserts the query settings of a query stream definition',
    summary: 'Upsert query stream settings',
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
      query: Query.right,
    }),
  }),
  handler: async ({ params, request, getScopedClients, context }) => {
    const { streamsClient, assetClient, attachmentClient } = await getScopedClients({
      request,
    });

    const core = await context.core;
    const queryStreamsEnabled = await core.uiSettings.client.get(
      OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS
    );

    if (!queryStreamsEnabled) {
      throw badData('Streams are not enabled for Query streams.');
    }

    const { name } = params.path;
    const { query } = params.body;

    let definition: Streams.all.Definition;
    try {
      definition = await streamsClient.getStream(name);
    } catch (error) {
      if (error instanceof DefinitionNotFoundError) {
        return await streamsClient.createQueryStream({ name, query });
      }
      throw error;
    }

    if (!Streams.QueryStream.Definition.is(definition)) {
      throw badData(`Cannot update query capabilities of non-query stream`);
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

    const upsertRequest: Streams.QueryStream.UpsertRequest = {
      dashboards,
      stream: {
        ...stream,
        query,
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

export const queryStreamRoutes = {
  ...readQueryStreamRoute,
  ...upsertQueryStreamRoute,
};
