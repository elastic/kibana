/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  RenameConversationResponse,
  ForkConversationResponse,
} from '../../../common/http_api/conversations';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
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

  // fork conversation from a specific round
  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_fork`,
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
        body: schema.object({
          round_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;
      const { round_id: roundId } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const conversation = await client.get(conversationId);

      const roundIndex = conversation.rounds.findIndex((round) => round.id === roundId);
      if (roundIndex === -1) {
        return response.badRequest({
          body: { message: `Round with id "${roundId}" not found in conversation` },
        });
      }

      const forkedConversation = await client.create({
        agent_id: conversation.agent_id,
        title: i18n.translate('xpack.onechat.forkConversation.title', {
          defaultMessage: 'Branched from: {title}',
          values: { title: conversation.title },
        }),
        rounds: conversation.rounds.slice(0, roundIndex + 1),
      });

      return response.ok<ForkConversationResponse>({
        body: {
          id: forkedConversation.id,
        },
      });
    })
  );
}
