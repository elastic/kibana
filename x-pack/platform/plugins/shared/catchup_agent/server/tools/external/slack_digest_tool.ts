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
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types/connector';
import { normalizeDateToCurrentYear } from '../utils/date_normalization';
import { getPluginServices } from '../../services/service_locator';

const slackDigestSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch Slack messages. If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Optional keywords to filter messages (e.g., user mentions, project names)'),
  includeDMs: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to include direct messages (DMs) in the results. Defaults to false. Only set to true if the user explicitly requests DMs (e.g., "including DMs", "with DMs", "direct messages").'
    ),
});

export const slackDigestTool = (): BuiltinToolDefinition<typeof slackDigestSchema> => {
  return {
    id: 'hackathon.catchup.external.slack',
    type: ToolType.builtin,
    description: `Fetches messages and threads from Slack since a given timestamp.

**Response Data:**
- userMentionMessages: Messages where you are mentioned (HIGH PRIORITY) - each message has a permalink field
- channelMessages: Regular channel messages - each message has a permalink field
- dmMessages: Direct messages (only if includeDMs=true) - each message has a permalink field

**Message Structure:**
Each message object contains: channel, text, user_name, timestamp, thread_replies_count, permalink, and thread_replies array.

**Summary Structure:**
- Prioritize important threads/conversations first
- Group related messages together
- Use user_name or user_real_name (never user_id)
- Include specific details (case IDs, host names, etc.)
- For threads, use the parent message's permalink

**DM Handling:**
- If includeDMs=false, do not mention DMs at all
- If includeDMs=true, include participant names from the channel field (e.g., "DM with John Doe")

**Connector Requirements:**
Requires Slack Web API connector (.slack_api) with User Token. Connector name must contain "UserToken" or "user token". Required scopes: channels:read, channels:history, groups:read, groups:history, im:read, im:history, users:read, search:read.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.`,
    schema: slackDigestSchema,
    handler: async ({ start, keywords, includeDMs = false }, { request, logger }) => {
      try {
        // Normalize date to current year if year is missing
        const normalizedStart = normalizeDateToCurrentYear(start);
        const startDate = new Date(normalizedStart);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
        }

        // Convert to Unix timestamp (seconds) for Slack API
        const startTimestamp = Math.floor(startDate.getTime() / 1000);

        // Get Actions plugin to access connectors
        const { plugin } = getPluginServices();
        if (!plugin.actions) {
          throw new Error('Actions plugin is not available');
        }

        // Get actions client and search for connectors
        const actionsClient = await plugin.actions.getActionsClientWithRequest(request);

        // Helper to detect token type from connector name
        const detectTokenType = (connectorName: string): 'bot' | 'user' | 'unknown' => {
          const nameLower = connectorName.toLowerCase();
          if (nameLower.includes('bottoken') || nameLower.includes('bot token')) {
            return 'bot';
          }
          if (nameLower.includes('usertoken') || nameLower.includes('user token')) {
            return 'user';
          }
          return 'unknown';
        };

        // Search for connectors by name pattern
        const allConnectors = await actionsClient.getAll();
        const slackConnectors = allConnectors.filter(
          (connector: ConnectorWithExtraFindData) => connector.actionTypeId === '.slack_api'
        );

        // Find user token connector (required)
        const userConnector = slackConnectors.find((connector: ConnectorWithExtraFindData) => {
          const detectedType = detectTokenType(connector.name || '');
          return detectedType === 'user';
        });

        if (!userConnector) {
          throw new Error(
            `No Slack User Token connector found. Please create a Slack Web API connector (type: .slack_api) with a name containing "UserToken" or "user token" (e.g., "Slack UserToken Connector"). ` +
              `The connector must have User Token scopes: channels:read, channels:history, groups:read, groups:history, im:read, im:history, users:read. ` +
              `User tokens allow access to channels the user is already a member of without requiring bot invites.`
          );
        }

        // Determine channel types based on whether DMs are requested
        // By default, exclude DMs ('im' and 'mpim') unless explicitly requested
        const channelTypes = ['public_channel', 'private_channel'];
        if (includeDMs) {
          channelTypes.push('im', 'mpim');
        }

        const userParams = {
          subAction: 'getChannelDigest',
          subActionParams: {
            since: startTimestamp,
            types: channelTypes,
            keywords,
          },
        };

        let userDigestResult;
        try {
          userDigestResult = await actionsClient.execute({
            actionId: userConnector.id,
            params: userParams,
          });
        } catch (executeError) {
          logger.error(`[CatchUp Agent] User connector execute error: ${executeError}`);
          throw executeError;
        }

        if (userDigestResult.status === 'error') {
          // Check if it's a retry error (rate limiting)
          if ('retry' in userDigestResult && userDigestResult.retry) {
            const retryMsg =
              userDigestResult.retry instanceof Date
                ? `Retry after ${userDigestResult.retry.toISOString()}`
                : 'Retry later';
            logger.warn(`[CatchUp Agent] User connector rate limited: ${retryMsg}`);
            throw new Error(
              `User connector rate limited: ${
                userDigestResult.message || userDigestResult.serviceMessage
              }. ${retryMsg}`
            );
          }

          throw new Error(
            `Failed to fetch Slack digest from user connector: ${
              userDigestResult.message || userDigestResult.serviceMessage
            }`
          );
        }

        const userDigest = userDigestResult.data as {
          total: number;
          start: string;
          keywords?: string[];
          channels_searched: number;
          userMentionMessages: Array<{
            channel: string;
            channel_id: string;
            text: string;
            user: string;
            user_name: string;
            user_real_name?: string;
            timestamp: string;
            thread_replies_count: number;
            permalink?: string;
            mentions: Array<{
              user_id: string;
              user_name: string;
              user_real_name?: string;
            }>;
            thread_replies: Array<{
              user: string;
              user_name: string;
              user_real_name?: string;
              text: string;
              ts: string;
              permalink?: string;
              mentions: Array<{
                user_id: string;
                user_name: string;
                user_real_name?: string;
              }>;
            }>;
          }>;
          channelMessages: Array<{
            channel: string;
            channel_id: string;
            text: string;
            user: string;
            user_name: string;
            user_real_name?: string;
            timestamp: string;
            thread_replies_count: number;
            permalink?: string;
            mentions: Array<{
              user_id: string;
              user_name: string;
              user_real_name?: string;
            }>;
            thread_replies: Array<{
              user: string;
              user_name: string;
              user_real_name?: string;
              text: string;
              ts: string;
              permalink?: string;
              mentions: Array<{
                user_id: string;
                user_name: string;
                user_real_name?: string;
              }>;
            }>;
          }>;
          dmMessages: Array<{
            channel: string;
            channel_id: string;
            text: string;
            user: string;
            user_name: string;
            user_real_name?: string;
            timestamp: string;
            thread_replies_count: number;
            permalink?: string;
            mentions: Array<{
              user_id: string;
              user_name: string;
              user_real_name?: string;
            }>;
            thread_replies: Array<{
              user: string;
              user_name: string;
              user_real_name?: string;
              text: string;
              ts: string;
              permalink?: string;
              mentions: Array<{
                user_id: string;
                user_name: string;
                user_real_name?: string;
              }>;
            }>;
          }>;
        };

        const totalChannels = userDigest.channels_searched;
        const totalMessages =
          userDigest.userMentionMessages.length +
          userDigest.channelMessages.length +
          userDigest.dmMessages.length;

        // Format results - return messages in the same structure as the service
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: totalMessages,
                start: normalizedStart,
                keywords: keywords || [],
                channels_searched: totalChannels,
                userMentionMessages: userDigest.userMentionMessages,
                channelMessages: userDigest.channelMessages,
                dmMessages: userDigest.dmMessages,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`[CatchUp Agent] Error in Slack digest tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error fetching Slack digest: ${errorMessage}`)],
        };
      }
    },
    tags: ['external', 'slack'],
  };
};
