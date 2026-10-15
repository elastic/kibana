/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
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
  ReviseMemoryRequest,
  WriteMemoryRequest,
  WriteMemoryResponse,
} from '../../common/http_api/memories';
import { apiPrivileges } from '../../common/features';
import { DEFAULT_MEMORY_EXPIRATION_DAYS } from '../../common/memory';
import type { GetAiIndexMemoryWriteServiceParams } from '../types';
import type { AiIndexMemoryWriteServiceApi } from '../ai_indices/memory_write_service';
import { MemoryWriteError, type MemoryWriteErrorCode } from '../ai_indices/memory_write_errors';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import {
  deleteMemoryResponseSchema,
  memoryCollectionParamsSchema,
  memoryItemParamsSchema,
  memoryReviseBodySchema,
  memoryWriteBodySchema,
  writeMemoryResponseSchema,
} from './schemas/memories_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const DESCRIPTION_SUFFIX =
  "The request uses the current user's Elasticsearch privileges. The request space selects the AI Index registration; memories without explicit permissions are shared with every space that registers the same destination. Returns 404 when Context Engine is turned off in the space or Memory is disabled.";
const INTERNAL_ERROR_MESSAGE = 'An unexpected error occurred while processing the memory request.';

const writer = {
  uri: MEMORY_API_PROVENANCE_SOURCE,
  metadata: {},
};

const elasticsearchErrorMessages = {
  400: 'Elasticsearch rejected the memory write request.',
  403: 'Elasticsearch denied the memory write.',
  404: 'The AI Index destination was not found.',
  409: 'The memory write conflicted with another operation.',
  429: 'Elasticsearch is temporarily unable to process the memory write.',
  503: 'Elasticsearch is temporarily unavailable.',
} as const;

const memoryWriteStatusCodes: Record<MemoryWriteErrorCode, 400 | 404 | 409 | 500> = {
  memory_disabled: 404,
  ai_index_memory_disabled: 400,
  destination_not_writable: 400,
  memory_not_found: 404,
  duplicate_memory: 409,
  revision_tie_window_exceeded: 409,
  not_a_memory: 400,
  memory_type_mismatch: 409,
  memory_deleted: 409,
  invalid_memory_timestamp: 500,
  missing_concurrency_metadata: 500,
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
    const body = { message: error.message };
    switch (memoryWriteStatusCodes[error.code]) {
      case 404:
        return response.notFound({ body });
      case 409:
        return response.conflict({ body });
      case 500:
        logger.error(error.stack ?? error.message);
        return response.customError({
          statusCode: 500,
          body: { message: INTERNAL_ERROR_MESSAGE },
        });
      default:
        return response.badRequest({ body });
    }
  }
  if (isResponseError(error)) {
    const { statusCode } = error;
    if (statusCode === 503) {
      return response.customError({
        statusCode,
        body: { message: elasticsearchErrorMessages[statusCode] },
      });
    }
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      // Kibana already authenticated the request, so an Elasticsearch 401 represents a downstream
      // authorization failure rather than a prompt for the client to authenticate with Kibana.
      const documentedStatus =
        statusCode === 401
          ? 403
          : ([400, 403, 404, 409, 429] as const).find((status) => status === statusCode) ?? 400;
      return response.customError({
        statusCode: documentedStatus,
        body: { message: elasticsearchErrorMessages[documentedStatus] },
      });
    }
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  return response.customError({
    statusCode: 500,
    body: { message: INTERNAL_ERROR_MESSAGE },
  });
};

const toServiceRequest = (aiIndexId: string, body: WriteMemoryRequest) => ({
  aiIndexId,
  type: body.type,
  title: body.title,
  description: body.description,
  content: body.content,
  ...(body.tags !== undefined && { tags: body.tags }),
  ...(body.expires_at !== undefined && { expiresAt: body.expires_at }),
  writer,
});

const toServiceRevisionRequest = (aiIndexId: string, body: ReviseMemoryRequest) => ({
  aiIndexId,
  ...(body.type !== undefined && { type: body.type }),
  ...(body.title !== undefined && { title: body.title }),
  ...(body.description !== undefined && { description: body.description }),
  ...(body.content !== undefined && { content: body.content }),
  ...(body.tags !== undefined && { tags: body.tags }),
  ...(body.expires_at !== undefined && { expiresAt: body.expires_at }),
  writer,
});

export const registerMemoryRoutes = ({
  router,
  logger,
  getAiIndexMemoryWriteService,
}: {
  router: IRouter;
  logger: Logger;
  getAiIndexMemoryWriteService: (
    params: GetAiIndexMemoryWriteServiceParams
  ) => AiIndexMemoryWriteServiceApi;
}) => {
  router.versioned
    .post({
      path: AI_INDEX_MEMORIES_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      operationId: 'create-context-engine-memory',
      summary: 'Create a memory',
      description: `Creates a memory in a memory-enabled AI Index using the caller's destination write privileges. New memories expire after ${DEFAULT_MEMORY_EXPIRATION_DAYS} days unless another expiry is supplied. If the destination index does not exist, Elasticsearch's normal auto-creation rules and the caller's create-index privileges apply. ${DESCRIPTION_SUFFIX}`,
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
              description:
                'The AI Index was not found, Context Engine is turned off, or Memory is disabled.',
            },
            409: { body: errorResponseSchema, description: 'The memory write conflicted.' },
            429: { body: errorResponseSchema, description: 'Too many requests.' },
            503: { body: errorResponseSchema, description: 'Elasticsearch is unavailable.' },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/memory_create.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const result = await getAiIndexMemoryWriteService({
            esClient: (await ctx.core).elasticsearch.client.asCurrentUser,
            request,
          }).createMemory({
            ...toServiceRequest(request.params.aiIndexId, request.body),
            ...(request.body.session_id !== undefined && {
              sessionId: request.body.session_id,
            }),
          });
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
      description: `Writes a partial revision using the caller's destination read and write privileges. Supply at least one memory field. Omitted fields are preserved, and a supplied type must match the existing memory. Concurrent revisions of the same data-stream-backed memory are unsupported. ${DESCRIPTION_SUFFIX}`,
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.6.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { params: memoryItemParamsSchema, body: memoryReviseBodySchema },
          response: {
            200: { body: writeMemoryResponseSchema, description: 'The memory was revised.' },
            400: { body: errorResponseSchema, description: 'The memory cannot be written.' },
            403: {
              body: errorResponseSchema,
              description: 'Elasticsearch denied the write.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'The AI Index or memory was not found, Context Engine is turned off, or Memory is disabled.',
            },
            409: { body: errorResponseSchema, description: 'The memory write conflicted.' },
            429: { body: errorResponseSchema, description: 'Too many requests.' },
            503: { body: errorResponseSchema, description: 'Elasticsearch is unavailable.' },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/memory_revise.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const result = await getAiIndexMemoryWriteService({
            esClient: (await ctx.core).elasticsearch.client.asCurrentUser,
            request,
          }).reviseMemory({
            ...toServiceRevisionRequest(request.params.aiIndexId, request.body),
            ...(request.body.session_id !== undefined && {
              sessionId: request.body.session_id,
            }),
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
      description: `Marks a memory as deleted using the caller's destination read and write privileges while retaining its lifecycle tombstone. Deleting an already-deleted memory succeeds without writing another revision. Subsequent revision attempts return a conflict. Concurrent operations on the same data-stream-backed memory are unsupported. ${DESCRIPTION_SUFFIX}`,
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
              description: 'The memory was tombstoned or was already tombstoned.',
            },
            400: { body: errorResponseSchema, description: 'The memory cannot be deleted.' },
            403: {
              body: errorResponseSchema,
              description: 'Elasticsearch denied the write.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'The AI Index or memory was not found, Context Engine is turned off, or Memory is disabled.',
            },
            409: { body: errorResponseSchema, description: 'The memory write conflicted.' },
            429: { body: errorResponseSchema, description: 'Too many requests.' },
            503: { body: errorResponseSchema, description: 'Elasticsearch is unavailable.' },
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
