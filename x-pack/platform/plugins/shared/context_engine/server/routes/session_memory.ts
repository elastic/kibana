/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_API_VERSION,
  MAX_SESSION_MEMORY_FORGET_IDS,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_USER_ID_LENGTH,
  SESSION_MEMORY_FORGET_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ForgetMode,
  ForgetSessionMemoriesResponse,
} from '../../common/http_api/session_memory';
import { SessionMemoryAuditAction, sessionMemoryAuditEvent } from '../audit/audit_events';
import type { SessionMemoryScope, SessionMemoryService } from '../session_memory/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

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
  action: SessionMemoryAuditAction;
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
}: {
  router: IRouter;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getSessionMemoryService: () => Promise<SessionMemoryService>;
}) => {
  router.versioned
    .post({
      path: SESSION_MEMORY_FORGET_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Forget session memories',
      description: [
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
