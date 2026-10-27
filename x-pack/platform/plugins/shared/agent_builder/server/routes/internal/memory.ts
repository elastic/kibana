/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { SHORT_TERM_MEMORY_LIMITS } from '@kbn/agent-builder-common';
import {
  ShortTermMemoryIdentityError,
  ShortTermMemoryNotFoundError,
} from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  DeleteAllShortTermMemoriesResponse,
  DeleteShortTermMemoryResponse,
  ListShortTermMemoriesResponse,
} from '../../../common/http_api/memory';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';
import { MAX_MEMORY_LIST_LIMIT } from '../../services/memory/memory_client';

const MAX_AGENT_ID_LENGTH = 512;
const MAX_QUERY_LENGTH = 1024;

const toErrorResponse = (response: KibanaResponseFactory, error: unknown) => {
  if (error instanceof ShortTermMemoryNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof ShortTermMemoryIdentityError) {
    return response.badRequest({ body: { message: error.message } });
  }
  throw error;
};

/** Routes a user calls to see and remove their own short-term memories. */
export function registerInternalMemoryRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: `${internalApiPath}/memory`,
      validate: {
        query: schema.object({
          agent_id: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_AGENT_ID_LENGTH })),
          query: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_QUERY_LENGTH })),
          limit: schema.maybe(schema.number({ min: 1, max: MAX_MEMORY_LIST_LIMIT })),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const client = await getInternalServices().memory.getScopedClient({ request });
        const { agent_id: agentId, query, limit } = request.query;
        const results = query
          ? await client.search({ query, agentId, limit })
          : await client.list({ agentId, limit, includeExpired: true });
        return response.ok<ListShortTermMemoriesResponse>({ body: { results } });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    })
  );

  router.delete(
    {
      path: `${internalApiPath}/memory/{id}`,
      validate: {
        params: schema.object({
          id: schema.string({ minLength: 1, maxLength: SHORT_TERM_MEMORY_LIMITS.idLength }),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const client = await getInternalServices().memory.getScopedClient({ request });
        await client.delete(request.params.id);
        return response.ok<DeleteShortTermMemoryResponse>({ body: { id: request.params.id } });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    })
  );

  router.delete(
    {
      path: `${internalApiPath}/memory`,
      validate: {
        query: schema.object({
          agent_id: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_AGENT_ID_LENGTH })),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const client = await getInternalServices().memory.getScopedClient({ request });
        const result = await client.deleteAll({ agentId: request.query.agent_id });
        return response.ok<DeleteAllShortTermMemoriesResponse>({ body: result });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    })
  );
}
