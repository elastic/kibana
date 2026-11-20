/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_API_VERSION,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  SESSION_MEMORY_FORGET_PATH,
} from '../../common/constants';
import type {
  ForgetSessionMemoriesResponse,
  ForgetSessionMemoryResult,
} from '../../common/http_api/session_memory';
import { validateNonBlank } from '../../common/validation';
import { sessionMemoryForgetAuditEvent } from '../audit/audit_events';
import type { SessionMemoryService } from '../session_memory/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { CONTEXT_ENGINE_DOCS_NOTE } from './constants';
import { MEMORY_WRITE_SECURITY, resolveMemoryUser, toError } from './memory_user';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const forgetBodySchema = schema.object({
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_USER_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          "The user the memories belong to. Omit this field to use the caller's user profile. Naming another user requires `contextEngine:manage_memory`. Memories of any other user return `not_found`.",
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
            { meta: { description: 'What happened to the memory.' } }
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

/** Registers the public `POST /api/context_engine/memory/_forget` route. */
export const registerSessionMemoryRoutes = ({
  router,
  getSpaces,
  getSessionMemoryService,
}: {
  router: IRouter;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getSessionMemoryService: () => Promise<SessionMemoryService>;
}) => {
  router.versioned
    .post({
      path: SESSION_MEMORY_FORGET_PATH,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Forget session memories',
      description: [
        "Requires the `contextEngine:write` privilege. Without `user_id`, the route forgets the caller's own memories, and a caller without a user profile gets a 403. Naming another user in `user_id` also requires `contextEngine:manage_memory`.",
        'Forgets session memories by id for that user. The route reports a memory of another user or another space as `not_found`, so it does not reveal whether the memory exists.',
        'Forgetting writes a tombstone so reads stop returning the memory, while Elasticsearch keeps its revisions until retention removes them. If Elasticsearch rejects a tombstone, the route returns `failed` with `error` and the caller can retry that id.',
        'The route writes one `memory_forget` audit event per unique memory id. Forgetting still works when memory is turned off.',
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
