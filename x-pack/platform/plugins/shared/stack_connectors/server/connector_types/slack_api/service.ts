/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { pipe } from 'fp-ts/pipeable';
import { map, getOrElse } from 'fp-ts/Option';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import type {
  PostBlockkitSubActionParams,
  PostMessageSubActionParams,
} from '@kbn/connector-schemas/slack_api';
import { CONNECTOR_ID, CONNECTOR_NAME, SLACK_URL } from '@kbn/connector-schemas/slack_api';
import type {
  SlackApiService,
  PostMessageResponse,
  SlackAPiResponse,
  ValidChannelResponse,
  ConversationsListResponse,
  ConversationsHistoryResponse,
  ConversationsRepliesResponse,
  UsersListResponse,
  ChannelDigestResponse,
  SlackMessage,
  SlackConversation,
} from '../../../common/slack_api/types';
import {
  retryResultSeconds,
  retryResult,
  serviceErrorResult,
  errorResult,
  successResult,
} from '../../../common/slack_api/lib';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';

const buildSlackExecutorErrorResponse = ({
  slackApiError,
  logger,
}: {
  slackApiError: {
    message: string;
    response?: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
    };
  };
  logger: Logger;
}) => {
  if (!slackApiError.response) {
    return serviceErrorResult(CONNECTOR_ID, slackApiError.message);
  }

  const { status, statusText, headers } = slackApiError.response;

  // special handling for 5xx
  if (status >= 500) {
    return retryResult(CONNECTOR_ID, slackApiError.message);
  }

  // special handling for rate limiting
  if (status === 429) {
    return pipe(
      getRetryAfterIntervalFromHeaders(headers),
      map((retry) => retryResultSeconds(CONNECTOR_ID, slackApiError.message, retry)),
      getOrElse(() => retryResult(CONNECTOR_ID, slackApiError.message))
    );
  }

  const errorMessage = i18n.translate(
    'xpack.stackConnectors.slack.unexpectedHttpResponseErrorMessage',
    {
      defaultMessage: 'unexpected http response from slack: {httpStatus} {httpStatusText}',
      values: {
        httpStatus: status,
        httpStatusText: statusText,
      },
    }
  );
  logger.error(`error on ${CONNECTOR_ID} slack action: ${errorMessage}`);

  const errorSource = getErrorSource(slackApiError as Error);

  return errorResult(CONNECTOR_ID, errorMessage, errorSource);
};

const buildSlackExecutorSuccessResponse = <T extends SlackAPiResponse>({
  slackApiResponseData,
}: {
  slackApiResponseData: T;
}): ConnectorTypeExecutorResult<void | T> => {
  if (!slackApiResponseData) {
    const errMessage = i18n.translate(
      'xpack.stackConnectors.slack.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from slack',
      }
    );
    return errorResult(CONNECTOR_ID, errMessage);
  }

  if (!slackApiResponseData.ok) {
    return serviceErrorResult(CONNECTOR_ID, slackApiResponseData.error);
  }
  return successResult<T>(CONNECTOR_ID, slackApiResponseData);
};

export const createExternalService = (
  {
    config,
    secrets,
  }: {
    config?: { allowedChannels?: Array<{ id: string; name: string }> };
    secrets: { token: string };
  },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector
): SlackApiService => {
  const { token } = secrets;
  const { allowedChannels } = config || { allowedChannels: [] };
  const allowedChannelIds = allowedChannels?.map((ac) => ac.id);

  if (!token) {
    throw Error(`[Action][${CONNECTOR_NAME}]: Wrong configuration.`);
  }

  const axiosInstance = axios.create();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-type': 'application/json; charset=UTF-8',
  };

  const validChannelId = async (
    channelId: string
  ): Promise<ConnectorTypeExecutorResult<ValidChannelResponse | void>> => {
    try {
      const validChannel = (): Promise<AxiosResponse<ValidChannelResponse>> => {
        return request<ValidChannelResponse>({
          axios: axiosInstance,
          configurationUtilities,
          logger,
          method: 'get',
          headers,
          url: `${SLACK_URL}conversations.info?channel=${channelId}`,
          connectorUsageCollector,
        });
      };
      if (channelId.length === 0) {
        return buildSlackExecutorErrorResponse({
          slackApiError: new Error('The channel id is empty'),
          logger,
        });
      }

      const result = await validChannel();

      return buildSlackExecutorSuccessResponse<ValidChannelResponse>({
        slackApiResponseData: result.data,
      });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getChannelToUse = ({
    channels,
    channelIds = [],
  }: {
    channels?: string[];
    channelIds?: string[];
  }): string => {
    if (
      channelIds.length > 0 &&
      allowedChannelIds &&
      allowedChannelIds.length > 0 &&
      !channelIds.every((cId) => allowedChannelIds.includes(cId))
    ) {
      throw new Error(
        `One of channel ids "${channelIds.join()}" is not included in the allowed channels list "${allowedChannelIds.join()}"`
      );
    }

    // For now, we only allow one channel but we wanted
    // to have a array in case we need to allow multiple channels
    // in one actions
    let channelToUse = channelIds.length > 0 ? channelIds[0] : '';
    if (channelToUse.length === 0 && channels && channels.length > 0 && channels[0].length > 0) {
      channelToUse = channels[0];
    }

    if (channelToUse.length === 0) {
      throw new Error(`The channel is empty"`);
    }

    return channelToUse;
  };

  const postMessage = async ({
    channels,
    channelIds = [],
    text,
  }: PostMessageSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      const channelToUse = getChannelToUse({ channels, channelIds });

      const result: AxiosResponse<PostMessageResponse> = await request({
        axios: axiosInstance,
        method: 'post',
        url: `${SLACK_URL}chat.postMessage`,
        logger,
        data: { channel: channelToUse, text },
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const postBlockkit = async ({
    channels,
    channelIds = [],
    text,
  }: PostBlockkitSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      const channelToUse = getChannelToUse({ channels, channelIds });
      const blockJson = JSON.parse(text);

      const result: AxiosResponse<PostMessageResponse> = await request({
        axios: axiosInstance,
        method: 'post',
        url: `${SLACK_URL}chat.postMessage`,
        logger,
        data: { channel: channelToUse, blocks: blockJson.blocks },
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getConversationsList = async (params: {
    types?: string;
    cursor?: string;
    excludeArchived?: boolean;
    limit?: number;
  }): Promise<ConnectorTypeExecutorResult<ConversationsListResponse>> => {
    try {
      const { types, cursor, excludeArchived = true, limit = 200 } = params;

      const queryParams = new URLSearchParams();
      if (types) queryParams.append('types', types);
      if (cursor) queryParams.append('cursor', cursor);
      if (excludeArchived) queryParams.append('exclude_archived', 'true');
      queryParams.append('limit', limit.toString());

      const url = `${SLACK_URL}conversations.list?${queryParams.toString()}`;

      const result: AxiosResponse<ConversationsListResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url,
        logger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      // Log detailed error information if there's an error
      if (!result.data.ok) {
        logger.warn(`[Slack Service] conversations.list error: ${result.data.error}`);
        // Check if it's a missing_scope error and provide helpful context
        if (result.data.error === 'missing_scope') {
          const requiredScope =
            types === 'public_channel'
              ? 'channels:read'
              : types === 'private_channel'
              ? 'groups:read'
              : types === 'im'
              ? 'im:read'
              : 'mpim:read';
          logger.error(
            `[Slack Service] MISSING SCOPE ERROR for ${types}. The connector token is missing the '${requiredScope}' scope. ` +
              `If you recently added this scope to your Slack app, you need to RE-AUTHORIZE the connector by: ` +
              `1. Re-installing the Slack app to your workspace, or 2. Updating the connector with a new token that includes the scope.`
          );
        }
      }

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] getConversationsList error: ${error}`);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getConversationsHistory = async (params: {
    channel: string;
    oldest?: number;
    cursor?: string;
    limit?: number;
  }): Promise<ConnectorTypeExecutorResult<ConversationsHistoryResponse>> => {
    try {
      const { channel, oldest, cursor, limit = 100 } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('channel', channel);
      if (oldest !== undefined) queryParams.append('oldest', oldest.toString());
      if (cursor) queryParams.append('cursor', cursor);
      queryParams.append('limit', limit.toString());

      const url = `${SLACK_URL}conversations.history?${queryParams.toString()}`;

      const result: AxiosResponse<ConversationsHistoryResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url,
        logger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      // Log errors (but still return as "success" so caller can handle)
      if (!result.data.ok) {
        logger.warn(
          `[Slack Service] conversations.history API error for channel ${channel}: ${
            result.data.error || 'unknown error'
          }`
        );
      }

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] getConversationsHistory error: ${error}`);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getConversationsReplies = async (params: {
    channel: string;
    ts: string;
  }): Promise<ConnectorTypeExecutorResult<ConversationsRepliesResponse>> => {
    try {
      const { channel, ts } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('channel', channel);
      queryParams.append('ts', ts);

      const url = `${SLACK_URL}conversations.replies?${queryParams.toString()}`;

      const result: AxiosResponse<ConversationsRepliesResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url,
        logger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      // Only log errors
      if (!result.data.ok) {
        logger.debug(
          `[Slack Service] conversations.replies error for channel ${channel}: ${result.data.error}`
        );
      }

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] getConversationsReplies error: ${error}`);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getUsersList = async (params: {
    cursor?: string;
    limit?: number;
  }): Promise<ConnectorTypeExecutorResult<UsersListResponse>> => {
    try {
      const { cursor, limit = 200 } = params;

      const queryParams = new URLSearchParams();
      if (cursor) queryParams.append('cursor', cursor);
      queryParams.append('limit', limit.toString());

      const url = `${SLACK_URL}users.list?${queryParams.toString()}`;

      const result: AxiosResponse<UsersListResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url,
        logger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      // Only log errors or when there are no more users
      if (!result.data.ok || !result.data.response_metadata?.next_cursor) {
        logger.debug(
          `[Slack Service] users.list response: ok=${result.data.ok}, error=${
            result.data.error
          }, members=${result.data.members?.length || 0}`
        );
      }

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] getUsersList error: ${error}`);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getChannelDigest = async (params: {
    since: number;
    types: string[];
    keywords?: string[];
  }): Promise<ConnectorTypeExecutorResult<ChannelDigestResponse>> => {
    try {
      const { since, types, keywords } = params;

      logger.info(
        `[Slack Service] Starting getChannelDigest for types: ${types.join(
          ', '
        )}, since: ${new Date(since * 1000).toISOString()}`
      );

      const userMap = new Map<string, { name: string; real_name?: string }>();

      // Helper function to wait for retry
      const waitForRetry = (retry: boolean | Date): number => {
        if (retry === true) {
          return 5000; // Default 5 seconds if no specific retry time
        }
        if (retry instanceof Date) {
          const waitMs = retry.getTime() - Date.now();
          return Math.max(1000, waitMs); // At least 1 second
        }
        return 0;
      };

      // Throttle API calls to stay under Slack's rate limits
      // Add a small delay between requests to avoid hitting rate limits proactively
      const throttleDelay = 150; // 150ms delay = ~400 requests/min max, well under limits
      const throttleRequest = async () => {
        await new Promise((resolve) => setTimeout(resolve, throttleDelay));
      };

      // Step 1: Fetch user information (optional, but helpful for user name mapping)
      // Note: We fetch users in batches but don't fail if we hit rate limits
      // User mapping will be incomplete but we can still proceed with messages
      // OPTIMIZATION: Skip user fetching entirely to reduce API calls and prevent rate limits
      // User names can be fetched lazily when needed, or we can proceed with user IDs
      logger.debug(
        `[Slack Service] Step 1: Skipping user list fetch to avoid rate limits (user names will be IDs if not mapped)`
      );
      const skipUserFetch = true; // Set to false to enable user fetching

      if (!skipUserFetch) {
        try {
          let userCursor: string | undefined;
          let hasMoreUsers = true;
          let userPageCount = 0;
          const maxUserPages = 5; // Reduced from 50 to limit API calls (fetches up to 1000 users)
          let consecutiveErrors = 0;
          const maxConsecutiveErrors = 3; // Stop after 3 consecutive non-retry errors

          while (
            hasMoreUsers &&
            userPageCount < maxUserPages &&
            consecutiveErrors < maxConsecutiveErrors
          ) {
            userPageCount++;
            // Throttle to avoid rate limits
            await throttleRequest();
            const usersResult = await getUsersList({ cursor: userCursor, limit: 200 });

            // Handle retry results (rate limiting)
            if (usersResult.status === 'error' && usersResult.retry) {
              const waitMs = waitForRetry(usersResult.retry);
              const waitSeconds = Math.ceil(waitMs / 1000);
              logger.warn(
                `Rate limited while fetching users, waiting ${waitSeconds} seconds before retry`
              );
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              // Retry the same request without incrementing page count
              consecutiveErrors = 0; // Reset error count on retry
              continue;
            }

            if (usersResult.status === 'ok' && usersResult.data?.ok && usersResult.data.members) {
              for (const user of usersResult.data.members) {
                userMap.set(user.id, {
                  name: user.name,
                  real_name: user.profile?.display_name || user.real_name || user.name,
                });
              }
              userCursor = usersResult.data.response_metadata?.next_cursor;
              hasMoreUsers = !!userCursor;
              consecutiveErrors = 0; // Reset on success
              // Only log every 10 pages or on completion to reduce noise
              if (userPageCount % 10 === 0 || !hasMoreUsers) {
                logger.debug(
                  `[Slack Service] Fetched ${usersResult.data.members.length} users (page ${userPageCount}), total users: ${userMap.size}, has_more: ${hasMoreUsers}`
                );
              }
            } else {
              consecutiveErrors++;
              // Check if it's a scope error (non-critical, continue)
              if (usersResult.data?.error === 'missing_scope') {
                logger.warn(
                  `Missing scope for users.list: ${usersResult.data.error}. Stopping user fetch.`
                );
                hasMoreUsers = false;
              } else {
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  logger.warn(
                    `Too many consecutive errors fetching users (${consecutiveErrors}/${maxConsecutiveErrors}), stopping user fetch. Continuing with messages.`
                  );
                  hasMoreUsers = false;
                } else {
                  // No cursor on error, so no more pages
                  hasMoreUsers = false;
                }
              }
            }
          }
          if (userPageCount >= maxUserPages) {
            logger.warn(
              `Reached maximum user pages limit (${maxUserPages}), stopping user fetch. Continuing with messages.`
            );
          }
          logger.debug(
            `[Slack Service] Step 1 complete: ${userMap.size} users mapped (may be incomplete)`
          );
        } catch (userError) {
          logger.warn(
            `Failed to fetch user list: ${userError}. Continuing without complete user mapping.`
          );
          // Continue without user mapping - not critical
        }
      }

      // Step 2: Fetch conversations for each type
      logger.debug(`[Slack Service] Step 2: Fetching conversations for types: ${types.join(', ')}`);

      // Check if we should use allowed channels (optimization: fetch only specific channels)
      const hasAllowedChannels = allowedChannelIds && allowedChannelIds.length > 0;
      const allChannels: SlackConversation[] = [];

      // Process channels if we have allowed channels configured (optimized path)
      if (hasAllowedChannels) {
        // OPTIMIZED PATH: Try conversations.info for each allowed channel, then verify membership
        // by attempting to fetch history. This avoids fetching all channels and hitting rate limits.
        logger.info(
          `[Slack Service] Checking ${allowedChannelIds.length} allowed channels directly (optimized to avoid rate limits)`
        );

        // Try each allowed channel ID directly
        for (const channelId of allowedChannelIds) {
          try {
            // Throttle to avoid rate limits
            await throttleRequest();
            // First, get channel info
            const channelInfoResult = await validChannelId(channelId);
            if (
              channelInfoResult.status === 'ok' &&
              channelInfoResult.data?.ok &&
              channelInfoResult.data.channel
            ) {
              const channel = channelInfoResult.data.channel;

              // Verify the user is actually a member by attempting a small history fetch
              // This is necessary because conversations.info can return channel info even
              // if the user isn't a member
              await throttleRequest();
              const testHistoryResult = await getConversationsHistory({
                channel: channelId,
                oldest: since,
                limit: 1, // Just fetch 1 message to verify access
              });

              // Only add channel if we can successfully fetch history (user is a member)
              if (testHistoryResult.status === 'ok' && testHistoryResult.data?.ok) {
                allChannels.push({
                  id: channel.id,
                  name: channel.name,
                  is_channel: channel.is_channel,
                  is_archived: channel.is_archived,
                  is_private: channel.is_private,
                });
                logger.debug(
                  `[Slack Service] Verified access to channel: ${channel.name} (${channel.id})`
                );
              } else {
                const error = testHistoryResult.data?.error;
                logger.warn(
                  `[Slack Service] User token cannot access channel ${channel.name} (${
                    channel.id
                  }): ${error || 'unknown error'}. User may not be a member.`
                );
              }
            } else {
              logger.warn(
                `[Slack Service] Failed to get channel info for ${channelId}: ${
                  channelInfoResult.data?.error || 'unknown error'
                }`
              );
            }
          } catch (error) {
            logger.warn(`[Slack Service] Error checking channel ${channelId}: ${error}`);
          }
        }

        // Log summary (channels are already filtered since we only add accessible ones)
        logger.info(
          `[Slack Service] Verified access to ${allChannels.length} of ${allowedChannelIds.length} allowed channels`
        );

        // Log details about found channels
        if (allChannels.length > 0) {
          const channelDetails = allChannels.map((ch) => `${ch.name} (${ch.id})`).join(', ');
          logger.info(`[Slack Service] Processing channels: ${channelDetails}`);
        }

        // Log which allowed channels were not accessible
        const foundChannelIds = new Set(allChannels.map((c) => c.id));
        const missingChannels = allowedChannelIds!.filter((id) => !foundChannelIds.has(id));
        if (missingChannels.length > 0) {
          logger.warn(
            `[Slack Service] ${
              missingChannels.length
            } allowed channel IDs were not accessible: ${missingChannels.join(
              ', '
            )}. The user associated with this token may not be a member of these channels.`
          );
        }
      } else {
        // STANDARD PATH: Fetch all conversations using conversations.list (for backwards compatibility)
        logger.warn(
          `[Slack Service] No allowed channels configured. Will fetch from ALL conversations (this may be slow for large workspaces).`
        );

        for (const type of types) {
          let cursor: string | undefined;
          let hasMore = true;
          let typePageCount = 0;
          const maxTypePages = 50; // Safety limit
          while (hasMore && typePageCount < maxTypePages) {
            typePageCount++;
            // Throttle to avoid rate limits
            await throttleRequest();
            const conversationsResult = await getConversationsList({
              types: type,
              cursor,
              excludeArchived: true,
              limit: 200,
            });

            // Handle retry results (rate limiting)
            if (conversationsResult.status === 'error' && conversationsResult.retry) {
              const waitMs = waitForRetry(conversationsResult.retry);
              const waitSeconds = Math.ceil(waitMs / 1000);
              logger.warn(
                `Rate limited while fetching ${type} conversations, waiting ${waitSeconds} seconds`
              );
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              // Retry the same request without incrementing page count
              continue;
            }

            if (
              conversationsResult.status === 'ok' &&
              conversationsResult.data?.ok &&
              conversationsResult.data.channels
            ) {
              allChannels.push(...conversationsResult.data.channels);
              cursor = conversationsResult.data.response_metadata?.next_cursor;
              hasMore = !!cursor;
            } else {
              // Check if it's a scope error (log and continue to next type)
              if (conversationsResult.data?.error === 'missing_scope') {
                logger.warn(
                  `Missing scope for ${type} conversations: ${conversationsResult.data.error}. Skipping this type.`
                );
              }
              hasMore = false;
            }
          }
          if (typePageCount >= maxTypePages) {
            logger.warn(`Reached maximum pages limit (${maxTypePages}) for ${type}, stopping`);
          }
        }
      }

      logger.info(`[Slack Service] Step 2 complete: ${allChannels.length} total channels found`);

      // Use allChannels as filteredChannels (already filtered if using allowed channels)
      const filteredChannels = allChannels;

      // Step 3: Fetch messages from each channel
      logger.info(
        `[Slack Service] Step 3: Fetching messages from ${filteredChannels.length} channels`
      );
      const allMessages: Array<{
        channel: { id: string; name: string };
        message: SlackMessage;
        thread_replies?: Array<{ user: string; text: string; ts: string }>;
      }> = [];

      // Cache for thread replies to avoid fetching the same thread multiple times
      const threadReplyCache = new Map<string, Array<{ user: string; text: string; ts: string }>>();

      for (let i = 0; i < filteredChannels.length; i++) {
        const channel = filteredChannels[i];
        logger.debug(
          `[Slack Service] Processing channel ${i + 1}/${filteredChannels.length}: ${
            channel.name
          } (${channel.id})`
        );
        try {
          let cursor: string | undefined;
          let hasMore = true;
          let channelMessageCount = 0;
          let channelPageCount = 0;
          const maxChannelPages = 100; // Safety limit
          let allMessagesTooOld = false; // Track if we've gone past the time window

          while (hasMore && channelPageCount < maxChannelPages && !allMessagesTooOld) {
            channelPageCount++;
            // Throttle to avoid rate limits
            await throttleRequest();
            const historyResult = await getConversationsHistory({
              channel: channel.id,
              oldest: since,
              cursor,
              limit: 100,
            });

            // Handle retry results (rate limiting)
            if (historyResult.status === 'error' && historyResult.retry) {
              const waitMs = waitForRetry(historyResult.retry);
              const waitSeconds = Math.ceil(waitMs / 1000);
              logger.warn(
                `Rate limited while fetching messages from ${channel.name}, waiting ${waitSeconds} seconds`
              );
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              // Retry the same request without incrementing page count
              continue;
            }

            if (
              historyResult.status === 'ok' &&
              historyResult.data?.ok &&
              historyResult.data.messages
            ) {
              let messages = historyResult.data.messages;
              const originalCount = messages.length;

              // Early termination: If all messages in this page are older than 'since', stop paginating
              // (Slack API returns messages in reverse chronological order, newest first)
              const allMessagesBeforeSince = messages.every((msg) => {
                const msgTimestamp = parseFloat(msg.ts);
                return msgTimestamp < since;
              });

              if (allMessagesBeforeSince && messages.length > 0) {
                logger.debug(
                  `[Slack Service] All messages in page ${channelPageCount} are older than since timestamp, stopping pagination for ${channel.name}`
                );
                allMessagesTooOld = true;
                hasMore = false;
                // Still process this page in case some messages are within the window
              }

              // Filter by keywords if provided
              if (keywords && keywords.length > 0) {
                messages = messages.filter((msg) =>
                  keywords.some((keyword) => msg.text.toLowerCase().includes(keyword.toLowerCase()))
                );
                logger.debug(
                  `[Slack Service] Filtered ${originalCount} messages to ${messages.length} matching keywords`
                );
              }

              // Process each message
              for (const message of messages) {
                // Skip messages older than 'since' (in case we're still processing this page)
                const msgTimestamp = parseFloat(message.ts);
                if (msgTimestamp < since) {
                  continue;
                }

                const messageData: {
                  channel: { id: string; name: string };
                  message: SlackMessage;
                  thread_replies?: Array<{ user: string; text: string; ts: string }>;
                } = {
                  channel: { id: channel.id, name: channel.name },
                  message,
                };

                // If message has thread replies, fetch them (only for messages that match keywords or if no keywords)
                // Note: messages are already filtered by keywords above, so we only process matching messages
                if (message.thread_ts && message.reply_count && message.reply_count > 0) {
                  // Check cache first to avoid duplicate API calls for the same thread
                  const threadCacheKey = `${channel.id}:${message.thread_ts}`;
                  if (threadReplyCache.has(threadCacheKey)) {
                    messageData.thread_replies = threadReplyCache.get(threadCacheKey);
                    logger.debug(
                      `[Slack Service] Using cached thread replies for ${channel.name} thread ${message.thread_ts}`
                    );
                  } else {
                    try {
                      // Throttle to avoid rate limits
                      await throttleRequest();
                      const repliesResult = await getConversationsReplies({
                        channel: channel.id,
                        ts: message.thread_ts,
                      });

                      if (
                        repliesResult.status === 'ok' &&
                        repliesResult.data?.ok &&
                        repliesResult.data.messages
                      ) {
                        // Filter out the parent message (first one), keep only replies
                        const replies = repliesResult.data.messages.slice(1);
                        const formattedReplies = replies.map((reply) => ({
                          user: reply.user || 'unknown',
                          text: reply.text,
                          ts: reply.ts,
                        }));

                        // Cache the replies for future use
                        threadReplyCache.set(threadCacheKey, formattedReplies);
                        messageData.thread_replies = formattedReplies;
                      }
                    } catch (replyError) {
                      logger.warn(
                        `Failed to fetch thread replies for ${channel.name}: ${replyError}`
                      );
                    }
                  }
                }

                allMessages.push(messageData);
                channelMessageCount++;
              }

              hasMore = historyResult.data.has_more || false;
              cursor = historyResult.data.response_metadata?.next_cursor;
              logger.debug(
                `[Slack Service] Channel ${channel.name}: page ${channelPageCount}, ${messages.length} messages, total: ${channelMessageCount}`
              );
            } else {
              // historyResult.status === 'error' or historyResult.data?.ok === false
              // Check error from both locations: data.error (for ok=false responses) and serviceMessage (for error status)
              const error = historyResult.data?.error || (historyResult as any).serviceMessage;
              const status = historyResult.status;
              const ok = historyResult.data?.ok;

              // Check for specific error types
              if (error === 'missing_scope') {
                logger.warn(
                  `Missing scope for ${channel.name}: ${error}. Required scope: ${
                    channel.is_private ? 'groups:history' : 'channels:history'
                  }. Skipping this channel.`
                );
              } else if (error === 'not_in_channel') {
                logger.error(
                  `[Slack Service] NOT_IN_CHANNEL for ${channel.name} (${channel.id}). ` +
                    `The user associated with this token is not a member of this channel. ` +
                    `Channel type: ${channel.is_private ? 'private' : 'public'}. ` +
                    `Please ensure the user who authorized the token is a member of this channel.`
                );
              } else if (error) {
                logger.warn(
                  `[Slack Service] Failed to fetch history for ${channel.name} (${channel.id}): ${error}`
                );
              } else {
                // Log minimal info when no error message found
                logger.warn(
                  `[Slack Service] Failed to fetch history for ${channel.name} (${channel.id}): ` +
                    `Status: ${status}, OK: ${ok}, Response keys: ${Object.keys(historyResult).join(
                      ', '
                    )}`
                );
              }
              hasMore = false;
            }
          }
          if (channelPageCount >= maxChannelPages) {
            logger.warn(
              `Reached maximum pages limit (${maxChannelPages}) for ${channel.name}, stopping`
            );
          }
          if (channelMessageCount > 0) {
            logger.debug(
              `[Slack Service] Channel ${channel.name} complete: ${channelMessageCount} messages`
            );
          }
        } catch (channelError) {
          logger.warn(`Error fetching messages from channel ${channel.name}: ${channelError}`);
          // Continue to next channel
        }
      }
      logger.info(
        `[Slack Service] Step 3 complete: ${allMessages.length} total messages from ${filteredChannels.length} channels`
      );

      // Format results
      logger.debug(`[Slack Service] Formatting ${allMessages.length} messages`);
      const formattedMessages = allMessages.map((item) => {
        const userInfo = userMap.get(item.message.user);
        return {
          channel: item.channel.name,
          channel_id: item.channel.id,
          text: item.message.text,
          user: item.message.user || 'unknown',
          user_name: userInfo?.name || item.message.user || 'unknown',
          user_real_name: userInfo?.real_name,
          timestamp: new Date(parseFloat(item.message.ts) * 1000).toISOString(),
          thread_replies_count: item.message.reply_count || 0,
          thread_replies: (item.thread_replies || []).map((reply) => {
            const replyUserInfo = userMap.get(reply.user);
            return {
              ...reply,
              user_name: replyUserInfo?.name || reply.user || 'unknown',
              user_real_name: replyUserInfo?.real_name,
            };
          }),
        };
      });

      const digestResponse: ChannelDigestResponse = {
        ok: true,
        total: formattedMessages.length,
        since: new Date(since * 1000).toISOString(),
        keywords: keywords || [],
        channels_searched: filteredChannels.length,
        messages: formattedMessages,
      };

      logger.info(
        `[Slack Service] getChannelDigest complete: ${digestResponse.total} messages from ${digestResponse.channels_searched} channels`
      );

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: digestResponse });
    } catch (error) {
      logger.error(`[Slack Service] getChannelDigest error: ${error}`);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  return {
    validChannelId,
    postMessage,
    postBlockkit,
    getConversationsList,
    getConversationsHistory,
    getConversationsReplies,
    getUsersList,
    getChannelDigest,
  };
};
