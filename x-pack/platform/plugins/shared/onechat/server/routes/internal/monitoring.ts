/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type { MonitoringListConversationsResponse } from '../../../common/http_api/conversations';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

export function registerInternalMonitoringRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Get single conversation for monitoring with aggregates
  router.get(
    {
      path: `${internalApiPath}/_monitoring/conversations/{conversation_id}`,
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;

      const client = await conversationsService.getScopedClient({ request });
      const conversation = await client.get(conversationId);

      // Calculate aggregates for this conversation
      const rounds = conversation.rounds;
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let totalToolCalls = 0;
      const connectorIds = new Set<string>();
      const connectorUsage: Record<string, { tokens_in: number; tokens_out: number }> = {};

      rounds.forEach((round) => {
        const tokensIn = round.model_usage.input_tokens;
        const tokensOut = round.model_usage.output_tokens;
        const connectorId = round.model_usage.connector_id;

        totalTokensIn += tokensIn;
        totalTokensOut += tokensOut;
        totalToolCalls += round.steps.filter((step) => step.type === 'tool_call').length;
        connectorIds.add(connectorId);

        // Track usage per connector
        if (!connectorUsage[connectorId]) {
          connectorUsage[connectorId] = { tokens_in: 0, tokens_out: 0 };
        }
        connectorUsage[connectorId].tokens_in += tokensIn;
        connectorUsage[connectorId].tokens_out += tokensOut;
      });

      return response.ok({
        body: {
          ...conversation,
          monitoring_metadata: {
            total_tokens_in: totalTokensIn,
            total_tokens_out: totalTokensOut,
            total_rounds: rounds.length,
            total_tool_calls: totalToolCalls,
            connector_ids: Array.from(connectorIds),
            connector_usage: connectorUsage,
          },
        },
      });
    })
  );

  // List conversations for monitoring with aggregates
  router.get(
    {
      path: `${internalApiPath}/_monitoring/conversations`,
      validate: {
        query: schema.object({
          start_date: schema.maybe(schema.string()),
          end_date: schema.maybe(schema.string()),
          user_name: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { start_date: startDate, end_date: endDate, user_name: userName } = request.query;

      const client = await conversationsService.getScopedClient({ request });
      const conversations = await client.list();

      // Filter conversations based on query params
      let filteredConversations = conversations;

      if (startDate) {
        const startDateObj = new Date(startDate);
        filteredConversations = filteredConversations.filter(
          (conv) => new Date(conv.created_at) >= startDateObj
        );
      }

      if (endDate) {
        const endDateObj = new Date(endDate);
        filteredConversations = filteredConversations.filter(
          (conv) => new Date(conv.created_at) <= endDateObj
        );
      }

      if (userName) {
        filteredConversations = filteredConversations.filter(
          (conv) => conv.user.username === userName
        );
      }

      // Fetch full conversation data for aggregates
      const conversationsWithRounds = await Promise.all(
        filteredConversations.map(async (conv) => {
          try {
            return await client.get(conv.id);
          } catch (error) {
            logger.error(`Failed to fetch conversation ${conv.id}`, error);
            return null;
          }
        })
      );

      const validConversations = conversationsWithRounds.filter(
        (c): c is NonNullable<typeof c> => c !== null
      );

      // Calculate aggregates
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let totalMessages = 0;
      let totalToolCalls = 0;

      const conversationSummaries = validConversations.map((conversation) => {
        const rounds = conversation.rounds;
        let tokensIn = 0;
        let tokensOut = 0;
        let toolCalls = 0;
        const connectorIds = new Set<string>();

        rounds.forEach((round) => {
          tokensIn += round.model_usage.input_tokens;
          tokensOut += round.model_usage.output_tokens;
          toolCalls += round.steps.filter((step) => step.type === 'tool_call').length;
          connectorIds.add(round.model_usage.connector_id);
        });

        totalTokensIn += tokensIn;
        totalTokensOut += tokensOut;
        totalMessages += rounds.length;
        totalToolCalls += toolCalls;

        return {
          id: conversation.id,
          title: conversation.title,
          agent_id: conversation.agent_id,
          created_at: conversation.created_at,
          user: conversation.user,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          rounds_count: rounds.length,
          tool_calls_count: toolCalls,
          connector_ids: Array.from(connectorIds),
        };
      });

      return response.ok<MonitoringListConversationsResponse>({
        body: {
          conversations: conversationSummaries,
          aggregates: {
            total_tokens_in: totalTokensIn,
            total_tokens_out: totalTokensOut,
            total_messages: totalMessages,
            total_tool_calls: totalToolCalls,
          },
        },
      });
    })
  );
}
