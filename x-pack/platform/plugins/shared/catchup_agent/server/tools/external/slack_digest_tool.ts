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
  since: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch Slack messages. If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
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

**IMPORTANT:** This tool requires a Slack Web API connector with a User Token (NOT bot tokens or webhooks).
- Slack Webhook connectors (".slack") can only send messages, not read them
- Slack Web API connectors (".slack_api") with Bot Tokens require the bot to be invited to each channel
- Slack Web API connectors (".slack_api") with User Tokens can read from channels the user is already a member of (no invites needed)

**Automatic Connector Discovery:**
This tool automatically searches for a Slack Web API connector with a name containing "UserToken" or "user token" (e.g., "Slack UserToken Connector").

**Required Scopes:**
The User Token connector must have these scopes:
- channels:read, channels:history (for public channels the user is a member of)
- groups:read, groups:history (for private channels the user is a member of)
- im:read, im:history (for direct messages)
- users:read (for user information)

**Connector Setup:**
1. Create a Slack Web API connector (type: .slack_api) with a name containing "UserToken" or "user token"
2. Configure the User Token OAuth scopes listed above
3. The tool will automatically discover and use this connector

**Benefits of User Tokens:**
- No need to invite bots to channels
- Can access all channels the user is already a member of
- Works for public channels, private channels, and DMs

**Direct Messages (DMs):**
When summarizing Direct Messages, ALWAYS include the name of the user(s) the DM is with in your summary. The channel field for DMs will be formatted as "DM with [User Name]" or "DM with [User1, User2, ...]" for group DMs. Make sure to explicitly mention who each DM conversation is with when summarizing.

The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
Optionally filters by keywords for user mentions or project names.`,
    schema: slackDigestSchema,
    handler: async ({ since, keywords }, { request, logger }) => {
      try {
        // Normalize date to current year if year is missing
        const normalizedSince = normalizeDateToCurrentYear(since);
        const sinceDate = new Date(normalizedSince);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // Convert to Unix timestamp (seconds) for Slack API
        const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

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

        logger.info(
          `[CatchUp Agent] Using user token connector: ${userConnector.name} (${userConnector.id})`
        );

        // Use user connector for all channel types (user token can access public channels, private channels, and DMs)
        const allChannelTypes = ['public_channel', 'private_channel', 'im', 'mpim'];
        const userParams = {
          subAction: 'getChannelDigest',
          subActionParams: {
            since: sinceTimestamp,
            types: allChannelTypes,
            keywords,
          },
        };

        logger.info(
          `[CatchUp Agent] Executing user connector for all channel types, since: ${new Date(
            sinceTimestamp * 1000
          ).toISOString()}`
        );

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
          since: string;
          keywords?: string[];
          channels_searched: number;
          messages: Array<{
            channel: string;
            channel_id: string;
            text: string;
            user: string;
            user_name: string;
            user_real_name?: string;
            timestamp: string;
            thread_replies_count: number;
            thread_replies: Array<{
              user: string;
              user_name: string;
              user_real_name?: string;
              text: string;
              ts: string;
            }>;
          }>;
        };

        logger.info(
          `[CatchUp Agent] User connector returned ${userDigest.messages.length} messages from ${userDigest.channels_searched} channels/DMs`
        );

        // Use the user connector result directly
        const allMessages = userDigest.messages;
        const totalChannels = userDigest.channels_searched;

        // Format results
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: allMessages.length,
                since: normalizedSince,
                keywords: keywords || [],
                channels_searched: totalChannels,
                messages: allMessages,
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
