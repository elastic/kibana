/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_KI_CONTENT_LENGTH,
  MAX_MEMORY_AI_INDEX_IDS,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTES,
  MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  SESSION_MEMORY_FORGET_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import type {
  ForgetSessionMemoriesResponse,
  ForgetSessionMemoryResult,
  RememberSessionMemoryResponse,
} from '../../common/http_api/session_memory';
import { validateAiIndexId, validateNonBlank } from '../../common/validation';
import { assertAiIndicesWritable } from '../ai_indices/assert_ai_indices_writable';
import { AiIndexNotFoundError, AiIndexWriteForbiddenError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import {
  sessionMemoryForgetAuditEvent,
  sessionMemoryRememberAuditEvent,
} from '../audit/audit_events';
import type { SessionMemoryService } from '../session_memory/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { CONTEXT_ENGINE_DOCS_NOTE } from './constants';
import { MEMORY_WRITE_SECURITY, resolveMemoryUser, toError } from './memory_user';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { MEMORY_DISABLED_MESSAGE, withContextEngineFeatureFlag } from './with_feature_flag';

const rememberBodySchema = schema.object({
  id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          'The id of an existing memory to revise. The revision replaces the memory in full, and the route does not check whether the id exists. Omit this field to generate a new id.',
      },
    })
  ),
  session_id: schema.string({
    minLength: 1,
    maxLength: MAX_MEMORY_ID_LENGTH,
    validate: validateNonBlank,
    meta: { description: 'The session the memory comes from.' },
  }),
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_USER_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          "The Kibana user profile UID that the memory belongs to. Omit this field to use the caller's user profile. Naming another user requires `contextEngine:manage_memory`.",
      },
    })
  ),
  ai_index_ids: schema.maybe(
    schema.arrayOf(
      schema.string({
        minLength: 1,
        maxLength: MAX_AI_INDEX_ID_LENGTH,
        validate: validateAiIndexId,
      }),
      {
        maxSize: MAX_MEMORY_AI_INDEX_IDS,
        meta: {
          description:
            'The AI indices that dreaming promotes the memory into. Each must exist in this space, and the caller requires the Elasticsearch `write` privilege on its backing index.',
        },
      }
    )
  ),
  content: schema.string({
    minLength: 1,
    maxLength: MAX_KI_CONTENT_LENGTH,
    validate: validateNonBlank,
    meta: {
      description: 'The memory text. Elasticsearch indexes this field for semantic search.',
    },
  }),
  attributes: schema.maybe(
    schema.recordOf(
      schema.string({
        minLength: 1,
        maxLength: MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
        validate: validateNonBlank,
      }),
      schema.string({ maxLength: MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH }),
      {
        validate: (attributes) =>
          Object.keys(attributes).length > MAX_SESSION_MEMORY_ATTRIBUTES
            ? `must have at most ${MAX_SESSION_MEMORY_ATTRIBUTES} attributes`
            : undefined,
        meta: {
          description: `String hints about the memory for dreaming. Accepts up to ${MAX_SESSION_MEMORY_ATTRIBUTES} entries, with non-blank keys of 1 to ${MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH} characters.`,
        },
      }
    )
  ),
});

const rememberResponseSchema = () =>
  schema.object({
    id: schema.string({
      meta: { description: 'The id of the memory. Pass it as `id` to revise the memory.' },
    }),
  });

const forgetBodySchema = schema.object({
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_USER_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          "The Kibana user profile UID that the memories belong to. Omit this field to use the caller's user profile. Naming another user requires `contextEngine:manage_memory`.",
      },
    })
  ),
  ids: schema.arrayOf(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_ID_LENGTH,
      validate: validateNonBlank,
    }),
    {
      minSize: 1,
      maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
      meta: { description: 'The ids of the memories to forget. The route collapses duplicates.' },
    }
  ),
});

const forgetResponseSchema = () =>
  schema.object(
    {
      results: schema.arrayOf(
        schema.object({
          id: schema.string({ meta: { description: 'The memory id.' } }),
          outcome: schema.oneOf(
            [
              schema.literal('forgotten'),
              schema.literal('already_forgotten'),
              schema.literal('not_found'),
              schema.literal('failed'),
            ],
            {
              meta: {
                description:
                  'What happened to the memory: `forgotten` if a tombstone was written, `already_forgotten` if it was already tombstoned, `not_found` if it does not exist or belongs to another user or space, or `failed` if Elasticsearch rejected the tombstone.',
              },
            }
          ),
          error: schema.maybe(
            schema.string({
              meta: {
                description: 'Why the tombstone failed when `outcome` is `failed`.',
              },
            })
          ),
        }),
        {
          maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
          meta: { description: 'One result per unique id, in request order.' },
        }
      ),
    },
    { meta: { description: 'The outcome for every requested memory.' } }
  );

const auditFailureForResult = (
  result: ForgetSessionMemoryResult
): 'not_found' | Error | undefined => {
  switch (result.outcome) {
    case 'forgotten':
    case 'already_forgotten':
      return undefined;
    case 'not_found':
      return 'not_found';
    case 'failed':
      return Object.assign(new Error(result.error), { name: 'failed' });
    default: {
      const exhaustive: never = result;
      throw new Error(`Unsupported forget result: ${JSON.stringify(exhaustive)}`);
    }
  }
};

/** Registers the public `_remember` and `_forget` session memory routes. */
export const registerSessionMemoryRoutes = ({
  router,
  getSpaces,
  getSessionMemoryService,
  getAiIndexService,
  isMemoryEnabled,
  logger,
}: {
  router: IRouter;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getSessionMemoryService: () => Promise<SessionMemoryService>;
  getAiIndexService: () => AiIndexService;
  isMemoryEnabled: (request: KibanaRequest) => Promise<boolean>;
  logger: Logger;
}) => {
  router.versioned
    .post({
      path: SESSION_MEMORY_REMEMBER_PATH,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Remember a session memory',
      description: [
        'Writes one memory to the session memory store. Pass `id` to revise an existing memory. The revision replaces the memory in full.',
        'Returns 202 with the memory id and writes the memory in the background, because semantic indexing runs inside the write. The memory becomes searchable after the background write completes.',
        "Requires the `contextEngine:write` privilege. Without `user_id`, the route writes the memory for the caller's user profile, and a caller without a user profile gets a 403. Naming another user in `user_id` also requires `contextEngine:manage_memory`.",
        'Each AI index in `ai_index_ids` must exist in this space, and the caller requires the Elasticsearch `write` privilege on its backing index. Otherwise, the route rejects the request and writes nothing.',
        'After authorization, validation, and feature-flag checks pass, the route writes one `memory_remember` audit event per request, when the background write finishes or when it rejects the request. The route does not report a failed background write in the response. Instead, it logs the error to the Kibana logs and writes a failure audit event.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`), when memory is turned off (`contextEngine:memoryEnabled`), or when an AI index in `ai_index_ids` does not exist.',
        CONTEXT_ENGINE_DOCS_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: rememberBodySchema },
          response: {
            202: {
              body: rememberResponseSchema,
              description:
                'The route accepted the memory and is writing it in the background. It becomes searchable after the write completes.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` is missing and the caller has no user profile, `user_id` names another user and the caller lacks `contextEngine:manage_memory`, or the caller cannot write to one of the AI indices.',
            },
            404: {
              body: errorResponseSchema,
              description: 'Context Engine or memory is turned off, or an AI index does not exist.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/session_memory_remember.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound({ body: { message: MEMORY_DISABLED_MESSAGE } });
        }

        const {
          id,
          session_id: sessionId,
          user_id: requestedUserId,
          ai_index_ids: aiIndexIds = [],
          content,
          attributes,
        } = request.body;
        const uniqueAiIndexIds = [...new Set(aiIndexIds)];
        const { security, elasticsearch, userProfile } = await ctx.core;
        const revision = id !== undefined;
        let targetUserId: string | undefined = requestedUserId;

        const audit = (outcome: { memoryId?: string; error?: Error }) =>
          security.audit.logger.log(
            sessionMemoryRememberAuditEvent({
              sessionId,
              targetUserId,
              revision,
              ...outcome,
            })
          );
        const reject = (error: Error, status: 'forbidden' | 'notFound') => {
          audit({ memoryId: id, error });
          return response[status]({ body: { message: error.message } });
        };

        let resolvedUser: Awaited<ReturnType<typeof resolveMemoryUser>>;
        try {
          resolvedUser = await resolveMemoryUser({ request, userProfile, requestedUserId });
        } catch (error) {
          audit({ memoryId: id, error: toError(error) });
          throw error;
        }
        targetUserId = resolvedUser.userId;

        if (!resolvedUser.ok) {
          return reject(resolvedUser.error, 'forbidden');
        }

        let space: string;
        try {
          space = resolveSpaceId(await getSpaces(), request);
          await assertAiIndicesWritable({
            aiIndexService: getAiIndexService(),
            esClient: elasticsearch.client.asCurrentUser,
            spaceId: space,
            aiIndexIds: uniqueAiIndexIds,
          });
        } catch (error) {
          if (error instanceof AiIndexNotFoundError) {
            return reject(error, 'notFound');
          }
          if (error instanceof AiIndexWriteForbiddenError) {
            return reject(error, 'forbidden');
          }
          audit({ memoryId: id, error: toError(error) });
          throw error;
        }

        let service: SessionMemoryService;
        try {
          service = await getSessionMemoryService();
        } catch (error) {
          audit({ memoryId: id, error: toError(error) });
          throw error;
        }

        const memoryId = id ?? randomUUID();

        const writeInBackground = async () => {
          try {
            await service.remember(
              { space, userId: resolvedUser.userId },
              { id: memoryId, sessionId, content, aiIndexIds: uniqueAiIndexIds, attributes }
            );
            audit({ memoryId });
          } catch (error) {
            const normalizedError = toError(error);
            logger.error(
              `Failed to remember session memory [id=${memoryId}]: ${normalizedError.message}`
            );
            audit({ memoryId, error: normalizedError });
          }
        };
        void writeInBackground();

        const body: RememberSessionMemoryResponse = { id: memoryId };
        return response.accepted({ body });
      })
    );

  router.versioned
    .post({
      path: SESSION_MEMORY_FORGET_PATH,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Forget session memories',
      description: [
        'Forgets session memories by ID for the target user. The route reports a memory of another user or another space as `not_found`, so it does not reveal whether the memory exists.',
        "Requires the `contextEngine:write` privilege. Without `user_id`, the route forgets the caller's own memories, and a caller without a user profile gets a 403. Naming another user in `user_id` also requires `contextEngine:manage_memory`.",
        'Forgetting writes a tombstone so reads stop returning the memory after the next Elasticsearch refresh, while Elasticsearch keeps its revisions until retention removes them. A read immediately after forgetting can still return the memory, and forgetting a memory right after writing it can return `not_found` until that write is visible. If Elasticsearch rejects a tombstone, the route returns `failed` with `error` and the caller can retry that ID.',
        'After authorization, validation, and feature-flag checks pass, the route writes one `memory_forget` audit event per unique memory ID. Forgetting still works when memory is turned off.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`).',
        CONTEXT_ENGINE_DOCS_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: forgetBodySchema },
          response: {
            200: {
              body: forgetResponseSchema,
              description: 'The outcome for every requested memory.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` is missing and the caller has no user profile, or `user_id` names another user and the caller lacks `contextEngine:manage_memory`.',
            },
            404: {
              body: errorResponseSchema,
              description: 'Context Engine is turned off in this space.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/session_memory_forget.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const { user_id: requestedUserId, ids } = request.body;
        const uniqueIds = [...new Set(ids)];
        const { security, userProfile } = await ctx.core;
        const auditLogger = security.audit.logger;
        let targetUserId: string | undefined = requestedUserId;

        const auditAll = (failure: Error) => {
          uniqueIds.forEach((memoryId) =>
            auditLogger.log(sessionMemoryForgetAuditEvent({ memoryId, targetUserId, failure }))
          );
        };

        let resolvedUser: Awaited<ReturnType<typeof resolveMemoryUser>>;
        try {
          resolvedUser = await resolveMemoryUser({ request, userProfile, requestedUserId });
        } catch (error) {
          auditAll(toError(error));
          throw error;
        }
        targetUserId = resolvedUser.userId;

        if (!resolvedUser.ok) {
          auditAll(resolvedUser.error);
          return response.forbidden({ body: { message: resolvedUser.error.message } });
        }

        const scope = {
          space: resolveSpaceId(await getSpaces(), request),
          userId: resolvedUser.userId,
        };

        let body: ForgetSessionMemoriesResponse;
        try {
          const results = await (await getSessionMemoryService()).forget(scope, uniqueIds);
          body = { results };
        } catch (error) {
          auditAll(toError(error));
          throw error;
        }

        body.results.forEach((result) =>
          auditLogger.log(
            sessionMemoryForgetAuditEvent({
              memoryId: result.id,
              targetUserId: resolvedUser.userId,
              failure: auditFailureForResult(result),
            })
          )
        );
        return response.ok({ body });
      })
    );
};
