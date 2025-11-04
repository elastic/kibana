/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { normalizeDateToCurrentYear } from '../utils/date_normalization';
import { getPluginServices } from '../../services/service_locator';

const SLACK_API_URL = 'https://slack.com/api/';

interface SlackMessage {
  text: string;
  user: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  replies?: Array<{
    user: string;
    ts: string;
    text: string;
  }>;
}

interface SlackConversation {
  id: string;
  name: string;
  is_private: boolean;
}

interface ConversationsListResponse {
  ok: boolean;
  channels?: SlackConversation[];
  error?: string;
}

interface ConversationsHistoryResponse {
  ok: boolean;
  messages?: SlackMessage[];
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface ConversationsRepliesResponse {
  ok: boolean;
  messages?: SlackMessage[];
  error?: string;
}

const slackDigestSchema = z.object({
  since: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch Slack messages. If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  connectorId: z.string().describe('Slack connector ID configured in Kibana'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Optional keywords to filter messages (e.g., user mentions, project names)'),
});

export const slackDigestTool = (): BuiltinToolDefinition<typeof slackDigestSchema> => {
  return {
    id: 'platform.catchup.external.slack',
    type: ToolType.builtin,
    description: `Fetches messages and threads from Slack since a given timestamp.

**IMPORTANT:** This tool requires a Slack Web API connector (NOT a webhook connector).
- Slack Webhook connectors (".slack") can only send messages, not read them
- Slack Web API connectors (".slack_api") use OAuth tokens and can read messages via the Slack API

The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The 'connectorId' must be a Slack Web API connector (actionTypeId: '.slack_api') configured in Kibana Actions with a valid OAuth token.
The connector's bot token must have the following Slack scopes: 'channels:read', 'groups:read', 'channels:history', 'groups:history'.
Optionally filters by keywords for user mentions or project names.`,
    schema: slackDigestSchema,
    handler: async ({ since, connectorId, keywords }, { request, logger }) => {
      try {
        logger.info(
          `[CatchUp Agent] Slack digest tool called with since: ${since}, connectorId: ${connectorId}`
        );

        // Normalize date to current year if year is missing
        const normalizedSince = normalizeDateToCurrentYear(since);
        const sinceDate = new Date(normalizedSince);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // Convert to Unix timestamp (seconds) for Slack API
        const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

        // Get Actions plugin to access connector
        const { plugin } = getPluginServices();
        if (!plugin.actions) {
          throw new Error('Actions plugin is not available');
        }

        // Get actions client and fetch connector
        const actionsClient = await plugin.actions.getActionsClientWithRequest(request);
        const connector = await actionsClient.get({
          id: connectorId,
          throwIfSystemAction: true,
        });

        // Verify it's a Slack API connector (not webhook)
        if (connector.actionTypeId !== '.slack_api') {
          throw new Error(
            `Connector ${connectorId} is not a Slack API connector. Only Slack API connectors (with token) are supported for reading messages.`
          );
        }

        // Get token from secrets (automatically decrypted)
        const secrets = connector.secrets as { token?: string };
        if (!secrets?.token) {
          throw new Error(`Slack connector ${connectorId} does not have a token configured`);
        }

        const token = secrets.token;

        // Get configuration utilities for making requests
        // Note: We need to create this ourselves since it's not exposed in the plugin start contract
        // For now, we'll use a simpler approach with direct axios calls and manual URL validation
        const { core } = getPluginServices();

        // Create axios instance with auth headers
        const axiosInstance = axios.create({
          timeout: 30000,
        });
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-type': 'application/json; charset=UTF-8',
        };

        // Step 1: Get list of channels the bot has access to
        const channelsResponse: AxiosResponse<ConversationsListResponse> = await axiosInstance.get(
          `${SLACK_API_URL}conversations.list?types=public_channel,private_channel&exclude_archived=true`,
          { headers }
        );

        if (!channelsResponse.data.ok || !channelsResponse.data.channels) {
          throw new Error(
            `Failed to fetch Slack channels: ${channelsResponse.data.error || 'Unknown error'}`
          );
        }

        const channels = channelsResponse.data.channels;
        logger.info(`[CatchUp Agent] Found ${channels.length} Slack channels`);

        // Step 2: Fetch messages from each channel
        const allMessages: Array<{
          channel: { id: string; name: string };
          message: SlackMessage;
          thread_replies?: Array<{ user: string; text: string; ts: string }>;
        }> = [];

        for (const channel of channels) {
          try {
            let cursor: string | undefined;
            let hasMore = true;

            // Fetch messages with pagination
            while (hasMore) {
              const historyResponse: AxiosResponse<ConversationsHistoryResponse> =
                await axiosInstance.get(
                  `${SLACK_API_URL}conversations.history?channel=${
                    channel.id
                  }&oldest=${sinceTimestamp}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
                  { headers }
                );

              if (!historyResponse.data.ok) {
                logger.warn(
                  `[CatchUp Agent] Failed to fetch messages from channel ${channel.name}: ${historyResponse.data.error}`
                );
                break;
              }

              const messages = historyResponse.data.messages || [];

              // Filter by keywords if provided
              let filteredMessages = messages;
              if (keywords && keywords.length > 0) {
                filteredMessages = messages.filter((msg) =>
                  keywords.some((keyword) => msg.text.toLowerCase().includes(keyword.toLowerCase()))
                );
              }

              // Process each message
              for (const message of filteredMessages) {
                const messageData: {
                  channel: { id: string; name: string };
                  message: SlackMessage;
                  thread_replies?: Array<{ user: string; text: string; ts: string }>;
                } = {
                  channel: { id: channel.id, name: channel.name },
                  message,
                };

                // If message has thread replies, fetch them
                if (message.thread_ts && message.reply_count && message.reply_count > 0) {
                  try {
                    const repliesResponse: AxiosResponse<ConversationsRepliesResponse> =
                      await axiosInstance.get(
                        `${SLACK_API_URL}conversations.replies?channel=${channel.id}&ts=${message.thread_ts}`,
                        { headers }
                      );

                    if (repliesResponse.data.ok && repliesResponse.data.messages) {
                      // Filter out the parent message (first one), keep only replies
                      const replies = repliesResponse.data.messages.slice(1);
                      messageData.thread_replies = replies.map((reply) => ({
                        user: reply.user || 'unknown',
                        text: reply.text,
                        ts: reply.ts,
                      }));
                    }
                  } catch (replyError: any) {
                    logger.warn(
                      `[CatchUp Agent] Failed to fetch thread replies for message ${message.ts}: ${replyError.message}`
                    );
                  }
                }

                allMessages.push(messageData);
              }

              // Check if there are more messages
              hasMore = historyResponse.data.has_more || false;
              cursor = historyResponse.data.response_metadata?.next_cursor;
            }
          } catch (channelError: any) {
            logger.warn(
              `[CatchUp Agent] Error fetching messages from channel ${channel.name}: ${channelError.message}`
            );
            // Continue to next channel
          }
        }

        logger.info(
          `[CatchUp Agent] Fetched ${allMessages.length} messages from Slack across ${channels.length} channels`
        );

        // Format results
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: allMessages.length,
                since: normalizedSince,
                keywords: keywords || [],
                channels_searched: channels.length,
                messages: allMessages.map((item) => ({
                  channel: item.channel.name,
                  channel_id: item.channel.id,
                  text: item.message.text,
                  user: item.message.user || 'unknown',
                  timestamp: new Date(parseFloat(item.message.ts) * 1000).toISOString(),
                  thread_replies_count: item.message.reply_count || 0,
                  thread_replies: item.thread_replies || [],
                })),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`[CatchUp Agent] Error in Slack digest tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`[CatchUp Agent] Slack digest tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error fetching Slack digest: ${errorMessage}`)],
        };
      }
    },
    tags: ['external', 'slack'],
  };
};
