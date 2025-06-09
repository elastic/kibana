/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type { ListConversationsResponse } from '../../common/http_api/conversations';
import { apiPrivileges } from '../../common/features';

export function registerConversationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/internal/onechat/conversations',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        body: schema.object({
          agentId: schema.maybe(schema.string({})),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { agentId } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const conversations = await client.list({ agentId });

      return response.ok<ListConversationsResponse>({
        body: {
          conversations,
        },
      });
    })
  );

  router.get(
    {
      path: '/internal/onechat/conversations/{conversationId}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        params: schema.object({
          conversationId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversationId } = request.params;

      const client = await conversationsService.getScopedClient({ request });
      const conversation = await client.get(conversationId);

      return response.ok({
        body: conversation,
      });
    })
  );
}
