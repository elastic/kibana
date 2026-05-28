/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  BulkDeleteConversationsResponse,
  ImportConversationResponse,
  RenameConversationResponse,
} from '../../../common/http_api/conversations';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

/**
 * Hard cap on rounds per `_import` call. Mirrors `IMPORT_MAX_ROUNDS` in
 * `services/conversation/client/client.ts`. Kept in the route to fail fast
 * before reaching the client.
 */
const ROUTE_IMPORT_MAX_ROUNDS = 1000;
/**
 * Hard cap on ids per `_bulk_delete` call. Mirrors `BULK_DELETE_MAX_IDS` in
 * `services/conversation/client/client.ts`.
 */
const ROUTE_BULK_DELETE_MAX_IDS = 1000;

export function registerInternalConversationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // rename conversation
  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_rename`,
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;
      const { title } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const updatedConversation = await client.update({
        id: conversationId,
        title,
      });

      return response.ok<RenameConversationResponse>({
        body: {
          id: updatedConversation.id,
          title: updatedConversation.title,
        },
      });
    })
  );

  // Import a conversation from an external transcript (evaluation harnesses).
  //
  // Internal-only: this endpoint bypasses any agent and writes user/assistant
  // messages verbatim. It is not intended for general client use.
  router.post(
    {
      path: `${internalApiPath}/conversations/_import`,
      validate: {
        body: schema.object({
          agent_id: schema.string({ minLength: 1 }),
          id: schema.maybe(schema.string({ minLength: 1 })),
          title: schema.maybe(schema.string()),
          mode: schema.maybe(schema.oneOf([schema.literal('create'), schema.literal('overwrite')])),
          rounds: schema.arrayOf(
            schema.object({
              user_message: schema.string({ minLength: 1 }),
              assistant_message: schema.string({ minLength: 1 }),
              started_at: schema.maybe(schema.string()),
            }),
            { minSize: 1, maxSize: ROUTE_IMPORT_MAX_ROUNDS }
          ),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const client = await conversationsService.getScopedClient({ request });

      const imported = await client.import(request.body);

      return response.ok<ImportConversationResponse>({
        body: {
          conversation_id: imported.id,
          round_count: imported.rounds.length,
          created_at: imported.created_at,
          updated_at: imported.updated_at,
        },
      });
    })
  );

  // Bulk-delete conversations for the current user.
  //
  // Internal-only: intended for evaluation runners that need to clean up after a
  // batch of test conversations. Always implicitly scoped to the current user.
  router.post(
    {
      path: `${internalApiPath}/conversations/_bulk_delete`,
      validate: {
        body: schema.object({
          conversation_ids: schema.maybe(
            schema.arrayOf(schema.string({ minLength: 1 }), {
              minSize: 1,
              maxSize: ROUTE_BULK_DELETE_MAX_IDS,
            })
          ),
          agent_id: schema.maybe(schema.string({ minLength: 1 })),
          created_after: schema.maybe(schema.string()),
          created_before: schema.maybe(schema.string()),
          dry_run: schema.maybe(schema.boolean()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const client = await conversationsService.getScopedClient({ request });

      const result = await client.bulkDelete(request.body);

      return response.ok<BulkDeleteConversationsResponse>({
        body: result,
      });
    })
  );
}
