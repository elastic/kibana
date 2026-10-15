/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { randomUUID } from 'crypto';
import type { IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { isResponseError } from '@kbn/es-errors';
import {
  AI_INDEX_API_VERSION,
  AI_INDEX_MEMORIES_PATH,
  AI_INDEX_MEMORY_BY_ID_PATH,
  MEMORY_API_PROVENANCE_SOURCE,
} from '../../common/constants';
import type {
  DeleteMemoryResponse,
  WriteMemoryRequest,
  WriteMemoryResponse,
} from '../../common/http_api/memories';
import { apiPrivileges } from '../../common/features';
import type { GetAiIndexMemoryWriteServiceParams } from '../types';
import type { AiIndexMemoryWriteServiceApi } from '../ai_indices/memory_write_service';
import { MemoryWriteError } from '../ai_indices/memory_write_errors';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { formatErrorMessage } from '../utils/format_es_error';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import {
  deleteMemoryResponseSchema,
  memoryCollectionParamsSchema,
  memoryItemParamsSchema,
  memoryWriteBodySchema,
  writeMemoryResponseSchema,
} from './schemas/memories_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const DESCRIPTION_SUFFIX =
  'The request uses the current user’s Elasticsearch privileges and the space from the request URL. Returns 404 when Context Engine is turned off in the space.';

const writer = {
  uri: MEMORY_API_PROVENANCE_SOURCE,
  metadata: {},
};

const handleMemoryWriteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof MemoryWriteError) {
    if (error.code === 'memory_not_found') {
      return response.notFound({ body: { message: error.message } });
    }
    if (
      error.code === 'memory_type_mismatch' ||
      error.code === 'memory_deleted' ||
      error.code === 'duplicate_memory' ||
      error.code === 'revision_tie_window_exceeded' ||
      error.code === 'missing_concurrency_metadata'
    ) {
      return response.conflict({ body: { message: error.message } });
    }
    return response.badRequest({ body: { message: error.message } });
  }
  if (isResponseError(error)) {
    const { statusCode, message } = error;
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      const documentedStatus =
        statusCode === 401
          ? 403
          : ([400, 403, 404, 409, 429] as const).find((status) => status === statusCode) ?? 400;
      return response.customError({ statusCode: documentedStatus, body: { message } });
    }
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  return response.customError({
    statusCode: 500,
    body: { message: formatErrorMessage(error) },
  });
};

const toServiceRequest = (aiIndexId: string, body: WriteMemoryRequest, sessionId: string) => ({
  aiIndexId,
  sessionId,
  type: body.type,
  title: body.title,
  description: body.description,
  content: body.content,
  ...(body.tags !== undefined && { tags: body.tags }),
  ...(body.expires_at !== undefined && { expiresAt: body.expires_at }),
  writer,
});

export const registerMemoryRoutes = ({
  router,
  logger,
  getAiIndexMemoryWriteService,
  generateSessionId = randomUUID,
}: {
  router: IRouter;
  logger: Logger;
  getAiIndexMemoryWriteService: (
    params: GetAiIndexMemoryWriteServiceParams
  ) => AiIndexMemoryWriteServiceApi;
  generateSessionId?: () => string;
}) => {
  router.versioned
    .post({
      path: AI_INDEX_MEMORIES_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      operationId: 'create-context-engine-memory',
      summary: 'Create a memory',
      description: `Creates a memory in a memory-enabled AI Index. ${DESCRIPTION_SUFFIX}`,
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.6.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { params: memoryCollectionParamsSchema, body: memoryWriteBodySchema },
          response: {
            201: { body: writeMemoryResponseSchema, description: 'The memory was created.' },
            400: { body: errorResponseSchema, description: 'The memory cannot be written.' },
            403: {
              body: errorResponseSchema,
              description: 'Elasticsearch denied the write.',
            },
            404: {
              body: errorResponseSchema,
              description: 'The AI Index was not found or Context Engine is turned off.',
            },
            409: { body: errorResponseSchema, description: 'The memory write conflicted.' },
            429: { body: errorResponseSchema, description: 'Too many requests.' },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/memory_create.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const sessionId = request.body.session_id ?? generateSessionId();
        try {
          const result = await getAiIndexMemoryWriteService({
            esClient: (await ctx.core).elasticsearch.client.asCurrentUser,
            request,
          }).createMemory(toServiceRequest(request.params.aiIndexId, request.body, sessionId));
          const body: WriteMemoryResponse = { id: result.id, session_id: result.sessionId };
          return response.created({ body });
        } catch (error) {
          return handleMemoryWriteError(error, response, logger);
        }
      })
    );

  router.versioned
    .patch({
      path: AI_INDEX_MEMORY_BY_ID_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      operationId: 'revise-context-engine-memory',
      summary: 'Revise a memory',
      description: `Revises an existing memory without changing its type. ${DESCRIPTION_SUFFIX}`,
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.6.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { params: memoryItemParamsSchema, body: memoryWriteBodySchema },
          response: {
            200: { body: writeMemoryResponseSchema, description: 'The memory was revised.' },
            400: { body: errorResponseSchema, description: 'The memory cannot be written.' },
            403: {
              body: errorResponseSchema,
              description: 'Elasticsearch denied the write.',
            },
            404: {
              body: errorResponseSchema,
              description: 'The AI Index or memory was not found.',
            },
            409: { body: errorResponseSchema, description: 'The memory write conflicted.' },
            429: { body: errorResponseSchema, description: 'Too many requests.' },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/memory_revise.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const sessionId = request.body.session_id ?? generateSessionId();
        try {
          const result = await getAiIndexMemoryWriteService({
            esClient: (await ctx.core).elasticsearch.client.asCurrentUser,
            request,
          }).reviseMemory({
            ...toServiceRequest(request.params.aiIndexId, request.body, sessionId),
            id: request.params.memoryId,
          });
          const body: WriteMemoryResponse = { id: result.id, session_id: result.sessionId };
          return response.ok({ body });
        } catch (error) {
          return handleMemoryWriteError(error, response, logger);
        }
      })
    );

  router.versioned
    .delete({
      path: AI_INDEX_MEMORY_BY_ID_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      operationId: 'delete-context-engine-memory',
      summary: 'Delete a memory',
      description: `Marks a memory as deleted while retaining its lifecycle tombstone. ${DESCRIPTION_SUFFIX}`,
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.6.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { params: memoryItemParamsSchema },
          response: {
            200: {
              body: deleteMemoryResponseSchema,
              description: 'The memory was tombstoned.',
            },
            400: { body: errorResponseSchema, description: 'The memory cannot be deleted.' },
            403: {
              body: errorResponseSchema,
              description: 'Elasticsearch denied the write.',
            },
            404: {
              body: errorResponseSchema,
              description: 'The AI Index or memory was not found.',
            },
            409: { body: errorResponseSchema, description: 'The memory write conflicted.' },
            429: { body: errorResponseSchema, description: 'Too many requests.' },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/memory_delete.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const result = await getAiIndexMemoryWriteService({
            esClient: (await ctx.core).elasticsearch.client.asCurrentUser,
            request,
          }).forgetMemory({
            aiIndexId: request.params.aiIndexId,
            id: request.params.memoryId,
            writer,
          });
          const body: DeleteMemoryResponse = result;
          return response.ok({ body });
        } catch (error) {
          return handleMemoryWriteError(error, response, logger);
        }
      })
    );
};
