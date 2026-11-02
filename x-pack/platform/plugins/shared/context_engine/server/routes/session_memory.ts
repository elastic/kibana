/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { isResponseError } from '@kbn/es-errors';
import {
  ES_SESSION_EVENTS_PATH,
  ES_SESSION_MEMORY_PATH,
  SESSION_EVENTS_BY_SESSION_PATH,
  SESSION_EVENTS_SAVE_PATH,
  SESSION_MEMORY_BY_SESSION_PATH,
  SESSION_MEMORY_INTERNAL_API_VERSION,
  SESSION_MEMORY_REMEMBER_PATH,
  SESSION_MEMORY_SEARCH_PATH,
} from '../../common/constants';
import type {
  ListSessionEventsResponse,
  ListSessionMemoryResponse,
  RememberSessionMemoryResponse,
  SaveSessionEventResponse,
  SearchSessionMemoryResponse,
  SessionScopeQuery,
} from '../../common/http_api/session_memory';
import { apiPrivileges } from '../../common/features';
import { formatErrorMessage } from '../utils/format_es_error';
import {
  rememberSessionMemoryBodySchema,
  saveSessionEventBodySchema,
  searchSessionMemoryBodySchema,
  sessionIdParamsSchema,
  sessionScopeQuerySchema,
} from './schemas/session_memory_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

/** ES `action_request_validation_exception` and friends name the offending field in `reason`; forward that. */
const handleSessionMemoryError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (isResponseError(error)) {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      logger.error(error.message);
    }
    return response.customError({ statusCode, body: { message: formatErrorMessage(error) } });
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  return response.customError({ statusCode: 500, body: { message: formatErrorMessage(error) } });
};

const toListQuerystring = ({ space, ai_index_id: aiIndexId, size }: SessionScopeQuery) => ({
  ...(space !== undefined ? { space } : {}),
  ...(aiIndexId !== undefined ? { ai_index_id: aiIndexId } : {}),
  ...(size !== undefined ? { size } : {}),
});

type TransportParams = Parameters<ElasticsearchClient['transport']['request']>[0];

const esRequest = <T>(esClient: ElasticsearchClient, params: TransportParams): Promise<T> =>
  esClient.transport.request<T>(params);

/**
 * Registers the session memory and session events routes. They proxy to the Elasticsearch
 * `_context_engine` APIs as the INTERNAL USER: the backing system data streams are owned by ES, and
 * `kibana_system` holds the `manage_context_engine` cluster privilege the APIs require, so the
 * Kibana-side `contextEngine` feature privileges are the only access control applied here.
 */
export const registerSessionMemoryRoutes = ({
  router,
  logger,
  isMemoryEnabled,
}: {
  router: IRouter;
  logger: Logger;
  /** Reads the global `contextEngine:memoryEnabled` setting; routes 404 while it is off. */
  isMemoryEnabled: (request: KibanaRequest) => Promise<boolean>;
}) => {
  router.versioned
    .post({
      path: SESSION_MEMORY_REMEMBER_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Remember a session memory',
      description:
        'Stores a session memory (text, media, or both) in the Context Engine session memory data stream.',
    })
    .addVersion(
      {
        version: SESSION_MEMORY_INTERNAL_API_VERSION,
        validate: { request: { body: rememberSessionMemoryBodySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound();
        }
        try {
          const esClient = (await ctx.core).elasticsearch.client.asInternalUser;
          const body = await esRequest<RememberSessionMemoryResponse>(esClient, {
            method: 'POST',
            path: `${ES_SESSION_MEMORY_PATH}/_remember`,
            body: request.body,
          });
          return response.ok({ body });
        } catch (error) {
          return handleSessionMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .post({
      path: SESSION_MEMORY_SEARCH_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Search session memory',
      description:
        'Searches session memory by meaning with a text or media query, optionally narrowed by session, user, agent, space, and AI index.',
    })
    .addVersion(
      {
        version: SESSION_MEMORY_INTERNAL_API_VERSION,
        validate: { request: { body: searchSessionMemoryBodySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound();
        }
        try {
          const esClient = (await ctx.core).elasticsearch.client.asInternalUser;
          const body = await esRequest<SearchSessionMemoryResponse>(esClient, {
            method: 'POST',
            path: `${ES_SESSION_MEMORY_PATH}/_search`,
            body: request.body,
          });
          return response.ok({ body });
        } catch (error) {
          return handleSessionMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .get({
      path: SESSION_MEMORY_BY_SESSION_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List session memories',
      description: 'Returns the memories stored for a session, newest first.',
    })
    .addVersion(
      {
        version: SESSION_MEMORY_INTERNAL_API_VERSION,
        validate: { request: { params: sessionIdParamsSchema, query: sessionScopeQuerySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound();
        }
        try {
          const esClient = (await ctx.core).elasticsearch.client.asInternalUser;
          const body = await esRequest<ListSessionMemoryResponse>(esClient, {
            method: 'GET',
            path: `${ES_SESSION_MEMORY_PATH}/${encodeURIComponent(request.params.sessionId)}`,
            querystring: toListQuerystring(request.query),
          });
          return response.ok({ body });
        } catch (error) {
          return handleSessionMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .post({
      path: SESSION_EVENTS_SAVE_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Save a session event',
      description:
        'Stores a raw transcript for a session in the Context Engine session events data stream.',
    })
    .addVersion(
      {
        version: SESSION_MEMORY_INTERNAL_API_VERSION,
        validate: { request: { body: saveSessionEventBodySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound();
        }
        try {
          const esClient = (await ctx.core).elasticsearch.client.asInternalUser;
          const body = await esRequest<SaveSessionEventResponse>(esClient, {
            method: 'POST',
            path: `${ES_SESSION_EVENTS_PATH}/_save`,
            body: request.body,
          });
          return response.ok({ body });
        } catch (error) {
          return handleSessionMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .get({
      path: SESSION_EVENTS_BY_SESSION_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List session events',
      description: 'Returns the events stored for a session, newest first.',
    })
    .addVersion(
      {
        version: SESSION_MEMORY_INTERNAL_API_VERSION,
        validate: { request: { params: sessionIdParamsSchema, query: sessionScopeQuerySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound();
        }
        try {
          const esClient = (await ctx.core).elasticsearch.client.asInternalUser;
          const body = await esRequest<ListSessionEventsResponse>(esClient, {
            method: 'GET',
            path: `${ES_SESSION_EVENTS_PATH}/${encodeURIComponent(request.params.sessionId)}`,
            querystring: toListQuerystring(request.query),
          });
          return response.ok({ body });
        } catch (error) {
          return handleSessionMemoryError(error, response, logger);
        }
      })
    );
};
