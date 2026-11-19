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
  MAX_SESSION_MEMORY_FORGET_IDS,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_USER_ID_LENGTH,
  SESSION_MEMORY_FORGET_PATH,
} from '../../common/constants';
import type { ForgetSessionMemoriesResponse } from '../../common/http_api/session_memory';
import { SessionMemoryAuditAction, sessionMemoryAuditEvent } from '../audit/audit_events';
import type { SessionMemoryService } from '../session_memory/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import {
  MANAGE_MEMORY_REQUIRED_MESSAGE,
  MEMORY_WRITE_SECURITY,
  canActOnUserMemory,
} from './memory_user';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const NO_PROFILE_MESSAGE =
  'The caller has no user profile, so there is no memory of its own to forget. Set `user_id`, log in to Kibana once to create a profile, or use an API key whose owner has one.';

const forgetBodySchema = schema.object({
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_SESSION_MEMORY_USER_ID_LENGTH,
      meta: {
        description:
          "The user the memories are about. Defaults to the caller's user profile. Naming another user needs `contextEngine:manage_memory`. A memory of any other user is reported as `not_found`.",
      },
    })
  ),
  ids: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_SESSION_MEMORY_ID_LENGTH }), {
    minSize: 1,
    maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
    meta: { description: 'The ids of the memories to forget. Duplicates are collapsed.' },
  }),
});

const forgetResponseSchema = () =>
  schema.object(
    {
      results: schema.arrayOf(
        schema.object({
          id: schema.string({ meta: { description: 'The memory id.' } }),
          outcome: schema.oneOf([
            schema.literal('forgotten'),
            schema.literal('already_forgotten'),
            schema.literal('not_found'),
          ]),
        }),
        {
          maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
          meta: { description: 'One result per unique id, in request order.' },
        }
      ),
    },
    { meta: { description: 'The outcome for every requested memory.' } }
  );

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
        "Requires the `contextEngine:write` privilege. Without `user_id` the route forgets the caller's own memories, and a caller without a user profile gets a 403. Naming another user in `user_id` also needs `contextEngine:manage_memory`.",
        'Forgets session memories by id, for that user. A memory of another user or in another space is reported as `not_found`, as if it did not exist.',
        'The memory stops being returned, but its revisions are kept until retention removes them.',
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
        const action = SessionMemoryAuditAction.FORGET;
        const uniqueIds = [...new Set(ids)];
        const { security, userProfile } = await ctx.core;
        const auditLogger = security.audit.logger;
        const callerUserId = (await userProfile.getCurrentProfileId()) ?? undefined;
        const userId = requestedUserId ?? callerUserId;

        if (userId === undefined) {
          return response.forbidden({ body: { message: NO_PROFILE_MESSAGE } });
        }

        if (!canActOnUserMemory(request, userId, callerUserId)) {
          const failure = Object.assign(new Error(MANAGE_MEMORY_REQUIRED_MESSAGE), {
            name: 'Forbidden',
          });
          uniqueIds.forEach((memoryId) =>
            auditLogger.log(
              sessionMemoryAuditEvent({ action, memoryId, targetUserId: userId, failure })
            )
          );
          return response.forbidden({ body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE } });
        }

        const scope = { space: resolveSpaceId(await getSpaces(), request), userId };

        let body: ForgetSessionMemoriesResponse;
        try {
          const outcomes = await (await getSessionMemoryService()).forget(scope, uniqueIds);
          body = { results: uniqueIds.map((id) => ({ id, outcome: outcomes[id] })) };
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
