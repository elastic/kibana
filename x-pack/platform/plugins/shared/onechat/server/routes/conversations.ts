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
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Conversation API');

export function registerConversationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List conversations
  router.versioned
    .get({
      path: '/api/chat/conversations',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'List conversations',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['conversation'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { query: schema.object({ agent_id: schema.maybe(schema.string()) }) },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { agent_id: agentId } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversations = await client.list({ agentId });

        return response.ok<ListConversationsResponse>({
          body: {
            results: conversations,
          },
        });
      })
    );

  // Get conversation by ID
  router.versioned
    .get({
      path: '/api/chat/conversations/{conversation_id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Get conversation by ID',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['conversation'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string(),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        return response.ok({
          body: conversation,
        });
      })
    );
}
