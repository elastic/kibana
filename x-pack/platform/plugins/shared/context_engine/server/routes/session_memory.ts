/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';
import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_KI_CONTENT_LENGTH,
  MAX_SESSION_MEMORY_AI_INDEX_IDS,
  MAX_SESSION_MEMORY_ATTRIBUTES,
  MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_SESSION_ID_LENGTH,
  MAX_SESSION_MEMORY_USER_ID_LENGTH,
  SESSION_MEMORY_FORGET_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ForgetMode,
  ForgetSessionMemoriesResponse,
  RememberSessionMemoryResponse,
} from '../../common/http_api/session_memory';
import { assertAiIndicesWritable } from '../ai_indices/assert_ai_indices_writable';
import { AiIndexNotFoundError, AiIndexNotWritableError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import {
  SessionMemoryAuditAction,
  sessionMemoryAuditEvent,
  sessionMemoryRememberAuditEvent,
} from '../audit/audit_events';
import type { SessionMemoryAuditEventParams } from '../audit/audit_events';
import type { SessionMemoryScope, SessionMemoryService } from '../session_memory/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { MEMORY_DISABLED_MESSAGE, withContextEngineFeatureFlag } from './with_feature_flag';

const MANAGE_MEMORY_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [apiPrivileges.writeContextEngine, apiPrivileges.manageMemory],
  },
};

const NO_PROFILE_MESSAGE =
  'The caller has no user profile, so its memory cannot be attributed to a user. Set `user_id`, log in to Kibana once to create a profile, or use an API key whose owner has one.';

const forbidden = (message: string): Error =>
  Object.assign(new Error(message), { name: 'Forbidden' });

const rememberBodySchema = schema.object({
  id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_SESSION_MEMORY_ID_LENGTH,
      meta: {
        description:
          'The id of an existing memory to revise. The revision replaces the memory in full, and the id is not checked. Defaults to a new id.',
      },
    })
  ),
  session_id: schema.string({
    minLength: 1,
    maxLength: MAX_SESSION_MEMORY_SESSION_ID_LENGTH,
    meta: { description: 'The session the memory comes from.' },
  }),
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_SESSION_MEMORY_USER_ID_LENGTH,
      meta: {
        description:
          "The user the memory is about. Defaults to the caller's user profile. Any user in the space can be named.",
      },
    })
  ),
  ai_index_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_AI_INDEX_ID_LENGTH }), {
      maxSize: MAX_SESSION_MEMORY_AI_INDEX_IDS,
      meta: {
        description:
          'The AI indices dreaming promotes the memory into. Each must exist in this space, and the caller needs the Elasticsearch `write` privilege on its backing index.',
      },
    })
  ),
  content: schema.string({
    minLength: 1,
    maxLength: MAX_KI_CONTENT_LENGTH,
    meta: { description: 'The memory text. It is indexed for semantic search.' },
  }),
  attributes: schema.maybe(
    schema.recordOf(
      schema.string({ minLength: 1, maxLength: MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH }),
      schema.string({ maxLength: MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH }),
      {
        validate: (attributes) =>
          Object.keys(attributes).length > MAX_SESSION_MEMORY_ATTRIBUTES
            ? `must have at most ${MAX_SESSION_MEMORY_ATTRIBUTES} attributes`
            : undefined,
        meta: { description: 'String hints about the memory, passed through to dreaming.' },
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
  user_id: schema.string({
    minLength: 1,
    maxLength: MAX_SESSION_MEMORY_USER_ID_LENGTH,
    meta: {
      description:
        'The user the memories are about. A memory of any other user is reported as `not_found`.',
    },
  }),
  ids: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_SESSION_MEMORY_ID_LENGTH }), {
    minSize: 1,
    maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
    meta: { description: 'The ids of the memories to forget. Duplicates are collapsed.' },
  }),
  mode: schema.oneOf([schema.literal('tombstone'), schema.literal('hard_delete')], {
    defaultValue: 'tombstone',
    meta: {
      description:
        '`tombstone` keeps the memory revisions until retention removes them. `hard_delete` removes every revision now.',
    },
  }),
});

const forgetResultsSchema = <Outcome extends string>(outcome: Type<Outcome>) =>
  schema.arrayOf(
    schema.object({
      id: schema.string({ meta: { description: 'The memory id.' } }),
      outcome,
    }),
    {
      maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
      meta: { description: 'One result per unique id, in request order.' },
    }
  );

const forgetResponseSchema = () =>
  schema.oneOf(
    [
      schema.object({
        mode: schema.literal('tombstone'),
        results: forgetResultsSchema(
          schema.oneOf([
            schema.literal('forgotten'),
            schema.literal('already_forgotten'),
            schema.literal('not_found'),
          ])
        ),
      }),
      schema.object({
        mode: schema.literal('hard_delete'),
        results: forgetResultsSchema(
          schema.oneOf([schema.literal('deleted'), schema.literal('not_found')])
        ),
      }),
    ],
    { meta: { description: 'The outcome for every requested memory.' } }
  );

const toResults = <Outcome extends string>(
  ids: readonly string[],
  outcomes: Record<string, Outcome>
) => ids.map((id) => ({ id, outcome: outcomes[id] }));

interface ForgetModeHandler {
  action: SessionMemoryAuditEventParams['action'];
  run: (
    service: SessionMemoryService,
    scope: SessionMemoryScope,
    ids: readonly string[]
  ) => Promise<ForgetSessionMemoriesResponse>;
}

const forgetModes: Record<ForgetMode, ForgetModeHandler> = {
  tombstone: {
    action: SessionMemoryAuditAction.FORGET,
    run: async (service, scope, ids) => ({
      mode: 'tombstone',
      results: toResults(ids, await service.forget(scope, ids)),
    }),
  },
  hard_delete: {
    action: SessionMemoryAuditAction.HARD_DELETE,
    run: async (service, scope, ids) => ({
      mode: 'hard_delete',
      results: toResults(ids, await service.hardDelete(scope, ids)),
    }),
  },
};

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
      security: MANAGE_MEMORY_SECURITY,
      access: 'public',
      summary: 'Remember a session memory',
      description: [
        'Writes one memory to the session memory store. Pass `id` to revise an existing memory; the revision replaces it in full.',
        'Answers 202 with the memory id at once and writes in the background, because semantic indexing runs inside the write. The memory is searchable only once the background write completes.',
        "The route needs the `contextEngine:manageMemory` privilege on top of `contextEngine:write`. It lets the caller write a memory for any user in the space by naming them in `user_id`. Without `user_id` the memory belongs to the caller's user profile, and a caller without one gets a 403.",
        'Each AI index in `ai_index_ids` must exist in this space, and the caller needs the Elasticsearch `write` privilege on its backing index. Otherwise the request is rejected and nothing is written.',
        'Each request writes one `memory_remember` audit event, when the background write finishes. A failed background write is not reported in the response. It shows up only in the Kibana logs and the audit log.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`), when memory is turned off, or when an AI index in `ai_index_ids` does not exist.',
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
                'The memory is being written. It is searchable once the write completes.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` is missing and the caller has no user profile, or the caller cannot write to one of the AI indices.',
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
        const space = resolveSpaceId(await getSpaces(), request);
        const { security, elasticsearch, userProfile } = await ctx.core;
        const userId = requestedUserId ?? (await userProfile.getCurrentProfileId()) ?? undefined;
        const revision = id !== undefined;

        const audit = (outcome: { memoryId?: string; error?: Error }) =>
          security.audit.logger.log(
            sessionMemoryRememberAuditEvent({
              sessionId,
              targetUserId: userId,
              revision,
              ...outcome,
            })
          );
        const reject = (error: Error, status: 'forbidden' | 'notFound') => {
          audit({ memoryId: id, error });
          return response[status]({ body: { message: error.message } });
        };

        if (userId === undefined) {
          return reject(forbidden(NO_PROFILE_MESSAGE), 'forbidden');
        }

        try {
          await assertAiIndicesWritable({
            aiIndexService: getAiIndexService(),
            esClient: elasticsearch.client.asCurrentUser,
            spaceId: space,
            aiIndexIds,
          });
        } catch (error) {
          if (error instanceof AiIndexNotFoundError) {
            return reject(error, 'notFound');
          }
          if (error instanceof AiIndexNotWritableError) {
            return reject(error, 'forbidden');
          }
          throw error;
        }

        const service = await getSessionMemoryService();
        const memoryId = id ?? randomUUID();

        const writeInBackground = async () => {
          try {
            await service.remember(
              { space, userId },
              { id: memoryId, sessionId, content, aiIndexIds, attributes }
            );
            audit({ memoryId });
          } catch (error) {
            logger.error(`Failed to remember session memory [id=${memoryId}]: ${error.message}`);
            audit({ memoryId, error });
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
      security: MANAGE_MEMORY_SECURITY,
      access: 'public',
      summary: 'Forget session memories',
      description: [
        'Requires the `contextEngine:write` and `contextEngine:manageMemory` privileges. With `contextEngine:manageMemory` the caller can forget the memories of any user in the space.',
        'Forgets session memories by id, for the user in `user_id`. A memory of another user or in another space is reported as `not_found`, as if it did not exist.',
        'In `tombstone` mode (the default) the memory stops being returned but its revisions are kept until retention removes them. In `hard_delete` mode every revision is removed now.',
        'Each memory is audited. Forgetting still works when memory is turned off.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`).',
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
        const { user_id: userId, ids, mode } = request.body;
        const { action, run } = forgetModes[mode];
        const uniqueIds = [...new Set(ids)];
        const auditLogger = (await ctx.core).security.audit.logger;
        const scope = { space: resolveSpaceId(await getSpaces(), request), userId };

        let body: ForgetSessionMemoriesResponse;
        try {
          body = await run(await getSessionMemoryService(), scope, uniqueIds);
        } catch (error) {
          uniqueIds.forEach((memoryId) =>
            auditLogger.log(
              sessionMemoryAuditEvent({ action, memoryId, targetUserId: userId, failure: error })
            )
          );
          throw error;
        }

        body.results.forEach(({ id: memoryId, outcome }) =>
          auditLogger.log(
            sessionMemoryAuditEvent({
              action,
              memoryId,
              targetUserId: userId,
              failure: outcome === 'not_found' ? 'not_found' : undefined,
            })
          )
        );
        return response.ok({ body });
      })
    );
};
