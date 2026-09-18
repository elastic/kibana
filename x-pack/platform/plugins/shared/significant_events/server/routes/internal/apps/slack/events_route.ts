/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { MAX_KEYWORD_LENGTH } from '@kbn/nightshift-investigations-plugin/common';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_NIGHTSHIFT_INVESTIGATIONS_ENABLED_FLAG } from '../../../../../common/feature_flags';
import { createServerRoute } from '../../../create_server_route';

const sourceKey = (workspaceId: string, channelId: string, threadTs: string): string =>
  ['slack_thread', workspaceId, channelId, threadTs].map(encodeURIComponent).join(':');

/**
 * Identifies the Slack *message*, not its delivery. Slack reports a mention inside a thread twice
 * — once as `app_mention` and once as `message` — under two different `event_id`s, and both are
 * admissible here. Keying admission on the message timestamp collapses them into one admission,
 * and still absorbs Slack's redelivery of either one.
 */
const messageKey = (workspaceId: string, channelId: string, messageTs: string): string =>
  ['slack_message', workspaceId, channelId, messageTs].map(encodeURIComponent).join(':');

const withoutLeadingMention = (text: string): string =>
  text.replace(/^\s*<@[A-Z0-9]+>\s*/u, '').trim();

const slackEventSchema = z
  .object({
    type: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    user: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
    text: z.string().max(MAX_TEXT_LENGTH).optional(),
    channel: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
    ts: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
    thread_ts: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
    subtype: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
    bot_id: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
  })
  .passthrough();

/**
 * Product-neutral Relay ingress. The registration selects Kibana event
 * delivery; all disposition and agent selection happens behind this route.
 * Relay only observes HTTP success or failure.
 */
export const slackEventsRoute = createServerRoute({
  // Deliberately outside this plugin's namespace: Relay addresses one Kibana surface for Slack
  // events and must not have to know which plugin currently owns the disposition behind it.
  endpoint: 'POST /internal/slack/events',
  options: {
    access: 'internal',
    summary: 'Handle a Slack event',
    description: 'Lets Kibana select how an event from its Slack registration is handled.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:read'],
    },
  },
  params: z.object({
    body: z
      .object({
        type: z.literal('event_callback'),
        team_id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
        event_id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
        event: slackEventSchema,
      })
      .passthrough(),
  }),
  handler: async ({ request, params, server }) => {
    const { body } = params;
    const { event } = body;
    const eventType = event.type;
    const message = withoutLeadingMention(event.text ?? '');
    const isHumanMessage = Boolean(event.user && !event.bot_id && !event.subtype && message);
    const isMention = eventType === 'app_mention';
    const isThreadReply = eventType === 'message' && Boolean(event.thread_ts);

    if (!isHumanMessage || (!isMention && !isThreadReply)) {
      return {};
    }

    const routeToNightshift = await server.core.featureFlags.getBooleanValue(
      STREAMS_NIGHTSHIFT_INVESTIGATIONS_ENABLED_FLAG,
      false
    );
    if (!routeToNightshift) {
      if (!isMention) {
        return {};
      }
      if (!server.relayClient) {
        throw new Error('Relay client is unavailable');
      }
      const channelId = event.channel;
      const threadTs = event.thread_ts ?? event.ts;
      if (!channelId || !threadTs || !event.user) {
        return {};
      }
      const externalConversationId = ['slack', body.team_id, channelId, threadTs]
        .map(encodeURIComponent)
        .join(':');
      await server.core.http.selfClient
        .asScoped(request)
        .fetch('/internal/agent_builder/converse/callback', {
          method: 'POST',
          version: '1',
          access: 'internal',
          body: {
            input: message,
            agent_id: agentBuilderDefaultAgentId,
            execution_idempotency_key: body.event_id,
            origin: {
              type: 'slack',
              external_conversation_id: externalConversationId,
              author: { id: event.user },
            },
            callback: { url: server.relayClient.getAgentBuilderCallbackUrl() },
            access_control: { access_mode: 'public' },
          },
        });
      return {};
    }

    const investigations = server.nightshiftInvestigations;
    if (!investigations) {
      throw new Error('Nightshift investigations is unavailable');
    }

    const channelId = event.channel;
    const messageTs = event.ts;
    const threadTs = event.thread_ts ?? messageTs;
    if (!channelId || !messageTs || !threadTs || !event.user) {
      return {};
    }

    await investigations.getInvestigationsClient(request).admitSlackInput({
      sourceKey: sourceKey(body.team_id, channelId, threadTs),
      idempotencyKey: messageKey(body.team_id, channelId, messageTs),
      message,
      senderId: event.user,
      startIfMissing: isMention,
      replyTarget: {
        surface: 'slack',
        tenant_key: body.team_id,
        channel: channelId,
        thread_ts: threadTs,
      },
    });

    return {};
  },
});
