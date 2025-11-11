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
- search:read (REQUIRED for searching messages and mentions across all channels)

**Connector Setup:**
1. Create a Slack Web API connector (type: .slack_api) with a name containing "UserToken" or "user token"
2. Configure the User Token OAuth scopes listed above
3. The tool will automatically discover and use this connector

**Benefits of User Tokens:**
- No need to invite bots to channels
- Can access all channels the user is already a member of
- Works for public channels, private channels, and DMs

**Direct Messages (DMs):**
By default, DMs are NOT included in the results. Only include DMs if the user explicitly requests them (e.g., "including DMs", "with DMs", "direct messages", "catch me up including DMs").

When summarizing Direct Messages, you MUST include the name of the user(s) the DM is with in your summary. The channel field for DMs will be formatted as "DM with [User Name]" or "DM with [User1, User2, ...]" for group DMs.

**CRITICAL**: The tool returns messages with the channel field already formatted to include participant names (e.g., "DM with John Doe" or "DM with Alice, Bob, Charlie"). When you see messages with channel names starting with "DM with", you MUST reference these names in your summary. For example:
- "DM with John Doe: [summary of messages]"
- "In a DM with Alice, Bob, and Charlie: [summary]"
- "Direct message from John Doe: [summary]"

Do NOT omit or ignore the participant names that are provided in the channel field. Always explicitly mention who each DM conversation is with when summarizing.

**Mentions:**
The tool automatically: (1) searches for mentions of the authenticated user across ALL public channels, (2) fetches messages from allowed channels, and (3) extracts ALL mentions from message text.

**Response Structure:**
The tool returns messages in THREE separate arrays:
- **userMentionMessages**: Messages where the authenticated user is mentioned (mentions array contains authenticated user's ID)
- **channelMessages**: Regular channel messages (no mention of authenticated user, or empty mentions array)
- **dmMessages**: Direct messages (DMs) - only included when includeDMs=true

**CRITICAL - Summarization Rules:**
1. **PRIORITIZE AND GROUP, DON'T LIST EVERYTHING** - Your goal is to save time by surfacing what matters, not restating every message. Group related messages into conversations/threads and prioritize by importance.
2. **Start with "### Key Topics Requiring Attention"** - Begin your summary with a prioritized list of the most important threads/conversations. Include: (a) Threads with decisions made, (b) Blockers or issues needing resolution, (c) Important updates or announcements, (d) Questions awaiting answers, (e) Action items assigned. For each key topic, provide: **Topic/Thread Title** - [1-2 sentence summary of what happened, what was decided, or what needs attention]. [View thread](<permalink>)
3. **Use userMentionMessages array for mentions** - ALL messages in this array mention the authenticated user. These are HIGH PRIORITY and should appear in the "Key Topics" section if they contain decisions, blockers, or action items.
4. **Group related messages** - Don't summarize each message individually. Group messages from the same thread or conversation together. If multiple messages discuss the same topic, summarize them as one conversation.
5. **Identify important threads** - Look for threads with: multiple replies (thread_replies_count > 0), questions being asked, decisions being made, blockers mentioned, PRs/issues being discussed, or action items assigned.
6. **Brief summaries for routine chatter** - For less important messages (routine updates, casual conversation, non-blocking discussions), provide only brief summaries or group them under a "### Other Updates" section at the end. Don't waste space on low-value content.
7. **Format mentions** - For mentions: "You were mentioned in #channel by @username: [summary]" (use user_name/user_real_name from mentions array, not user_id). If the mention is part of an important thread, include it in the Key Topics section.
8. **Use human-readable names** - ALWAYS use user_name or user_real_name from mentions array, NEVER user_id
9. **Include permalinks for important threads** - For key topics and important conversations, include the permalink. For threads, use the parent message's permalink (thread replies share the parent's permalink). Format: [View thread](<permalink>) or [View message](<permalink>)
10. **Structure your summary**:
    - Start with "### Key Topics Requiring Attention" (prioritized list)
    - Follow with "### Mentions" (if any userMentionMessages that aren't already in Key Topics)
    - End with "### Other Updates" (brief summaries of routine chatter, grouped by channel)

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
Optionally filters by keywords for user mentions or project names.`,
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

        logger.info(
          `[CatchUp Agent] Using user token connector: ${userConnector.name} (${userConnector.id})`
        );

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

        logger.info(
          `[CatchUp Agent] Executing user connector for channel types: ${channelTypes.join(
            ', '
          )}, includeDMs: ${includeDMs}, start: ${new Date(startTimestamp * 1000).toISOString()}`
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

        logger.info(
          `[CatchUp Agent] User connector returned ${totalMessages} messages from ${userDigest.channels_searched} channels/DMs: ` +
            `${userDigest.userMentionMessages.length} mentions, ${userDigest.channelMessages.length} channel messages, ${userDigest.dmMessages.length} DMs ` +
            `(includes mentions from all channels via search.messages API)`
        );

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
