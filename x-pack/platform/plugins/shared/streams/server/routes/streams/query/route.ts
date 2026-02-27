/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badData, badRequest } from '@hapi/boom';
import { Streams, getEsqlViewName } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS } from '@kbn/management-settings-ids';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE } from '../../../lib/streams/assets/fields';
import { getEsqlView } from '../../../lib/streams/esql_views/manage_esql_views';

/**
 * Schema for API request body - accepts esql for UX simplicity.
 * This is different from the stored Query schema which uses { view: string }.
 */
const queryRequestBodySchema = z.object({
  esql: z.string(),
});

export interface QueryStreamObjectGetResponse {
  /** The view reference stored in the definition */
  query: Streams.QueryStream.Definition['query'] & { esql: string };
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
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<QueryStreamObjectGetResponse> => {
    const { streamsClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;

    const definition = await streamsClient.getStream(name);

    if (!Streams.QueryStream.Definition.is(definition)) {
      throw badRequest(`Stream is not a query stream`);
    }

    // Fetch the actual esql from the ES|QL view
    const viewName = definition.query.view;
    const esqlView = await getEsqlView({
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      name: viewName,
    });

    return {
      query: {
        ...definition.query,
        esql: esqlView.query,
      },
    };
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
      // API accepts esql for UX simplicity, not the stored query format
      query: queryRequestBodySchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients, context, logger }) => {
    const { streamsClient, queryClient, attachmentClient } = await getScopedClients({
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
    const { esql } = params.body.query;

    // Generate the view name from the stream name
    const viewName = getEsqlViewName(name);

    // The query reference to include in the definition (with esql for validation and view creation)
    const queryReference: Streams.QueryStream.Definition['query'] = {
      view: viewName,
      esql,
    };

    let definition: Streams.all.Definition;
    try {
      definition = await streamsClient.getStream(name);
    } catch (error) {
      if (error instanceof DefinitionNotFoundError) {
        // Create new query stream - the state management will handle view creation
        return await streamsClient.createQueryStream({ name, query: queryReference });
      }
      throw error;
    }

    if (definition && !Streams.QueryStream.Definition.is(definition)) {
      throw badData(`The stream "${name}" already exists and is not a query stream.`);
    }

    // Get existing assets and attachments to preserve them
    const [assets, attachments] = await Promise.all([
      queryClient.getAssets(name),
      attachmentClient.getAttachments(name),
    ]);

    const dashboards = attachments
      .filter((attachment) => attachment.type === 'dashboard')
      .map((attachment) => attachment.id);

    const rules = attachments
      .filter((attachment) => attachment.type === 'rule')
      .map((attachment) => attachment.id);

    const queries = assets
      .filter((asset) => asset[ASSET_TYPE] === 'query')
      .map((asset) => asset.query);

    // Remove name and updated_at from definition - these are not allowed in UpsertRequest
    const { name: _name, updated_at: _updatedAt, ...stream } = definition;

    const upsertRequest: Streams.QueryStream.UpsertRequest = {
      dashboards,
      stream: {
        ...stream,
        query: queryReference,
      },
      queries,
      rules,
    };

    // The state management will handle ES|QL view creation/update and validation
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
