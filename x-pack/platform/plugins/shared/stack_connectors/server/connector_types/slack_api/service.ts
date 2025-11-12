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
  SearchMessagesResponse,
  ConversationsRepliesResponse,
  ConversationsMembersResponse,
  UsersListResponse,
  UserInfoResponse,
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
    config?: { allowedChannels?: Array<{ id?: string; name: string }> };

    secrets: { token: string };
  },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector
): SlackApiService => {
  const { token } = secrets;
  const { allowedChannels } = config || { allowedChannels: [] };
  const allowedChannelIds = allowedChannels
    ?.map((ac) => ac.id)
    .filter((id): id is string => id !== undefined);
  const allowedChannelNames = allowedChannels?.map((ac) => ac.name);

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

  const validateChannels = ({
    channels,
    allowedList,
  }: {
    channels?: string[];
    allowedList?: string[];
  }) => {
    if (!channels || !channels.length || !allowedList || !allowedList.length) return;

    const normalizeChannel = (name: string) => name.replace(/^#/, '');

    const hasDisallowedChannel = channels?.some(
      (name) => !allowedList.some((allowed) => normalizeChannel(allowed) === normalizeChannel(name))
    );

    if (hasDisallowedChannel) {
      throw new Error(
        `One or more provided channel names are not included in the allowed channels list`
      );
    }
  };

  /**
   * Selects the Slack channel to use for message delivery. At the moment, only posting to a single channel is supported.
   *
   * Priority order:
   *   1. If channelNames is provided and non-empty, validates against allowedChannelNames (if configured) and returns the first entry.
   *   2. If channelIds is provided and non-empty, validates against allowedChannelIds (if configured) and returns the first entry.
   *   3. If channels (legacy) is provided and non-empty, returns the first entry.
   *   4. Throws if none are provided or all are empty.
   *
   * If allowedChannels is empty or undefined, no validation is performed against allowedChannelNames or allowedChannelIds.
   */
  const getChannelToUse = ({
    channels = [],
    channelIds = [],
    channelNames = [],
  }: {
    channels?: string[];
    channelIds?: string[];
    channelNames?: string[];
  }): string => {
    const hasChannels = channelNames.length > 0 || channelIds.length > 0 || channels.length > 0;

    if (!hasChannels) {
      throw new Error(
        `One of channels, channelIds, or channelNames is required and cannot be empty`
      );
    }

    // priority: channelNames > channelIds > channels
    if (channelNames.length > 0) {
      validateChannels({
        channels: channelNames,
        allowedList: allowedChannelNames,
      });

      return channelNames[0];
    }

    if (channelIds.length > 0) {
      validateChannels({ channels: channelIds, allowedList: allowedChannelIds });
      return channelIds[0];
    }

    if (channels && channels.length > 0) {
      return channels[0];
    }

    throw new Error(`No valid channel found to use`);
  };

  const postMessage = async ({
    channels = [],
    channelIds = [],
    channelNames = [],
    text,
  }: PostMessageSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      const channelToUse = getChannelToUse({ channels, channelIds, channelNames });

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
    channels = [],
    channelIds = [],
    channelNames = [],
    text,
  }: PostBlockkitSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      const channelToUse = getChannelToUse({ channels, channelIds, channelNames });
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

  const getConversationsMembers = async (params: {
    channel: string;
    cursor?: string;
    limit?: number;
  }): Promise<ConnectorTypeExecutorResult<ConversationsMembersResponse>> => {
    try {
      const { channel, cursor, limit = 100 } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('channel', channel);
      if (cursor) queryParams.append('cursor', cursor);
      queryParams.append('limit', limit.toString());

      const url = `${SLACK_URL}conversations.members?${queryParams.toString()}`;

      const result: AxiosResponse<ConversationsMembersResponse> = await request({
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
          `[Slack Service] conversations.members error for channel ${channel}: ${result.data.error}`
        );
      }

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] getConversationsMembers error: ${error}`);
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

  const getUserInfo = async (params: {
    user: string;
  }): Promise<ConnectorTypeExecutorResult<UserInfoResponse>> => {
    try {
      const { user } = params;

      if (!user || user.length === 0) {
        return buildSlackExecutorErrorResponse({
          slackApiError: new Error('The user id is empty'),
          logger,
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append('user', user);

      const url = `${SLACK_URL}users.info?${queryParams.toString()}`;

      const result: AxiosResponse<UserInfoResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url,
        logger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] getUserInfo error: ${error}`);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const searchMessages = async (params: {
    query: string;
    count?: number;
    page?: number;
  }): Promise<ConnectorTypeExecutorResult<SearchMessagesResponse>> => {
    try {
      const { query, count = 20, page = 1 } = params;

      if (!query || query.length === 0) {
        return buildSlackExecutorErrorResponse({
          slackApiError: new Error('The search query is empty'),
          logger,
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append('query', query);
      queryParams.append('count', count.toString());
      queryParams.append('page', page.toString());

      const url = `${SLACK_URL}search.messages?${queryParams.toString()}`;

      const result: AxiosResponse<SearchMessagesResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url,
        logger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      logger.warn(`[Slack Service] searchMessages error: ${error}`);
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

      // Get the authenticated user's ID and username using auth.test
      let authenticatedUserId: string | undefined;
      let authenticatedUsername: string | undefined;
      try {
        const authTestResult = await request<{ ok: boolean; user_id?: string; user?: string }>({
          axios: axiosInstance,
          configurationUtilities,
          logger,
          method: 'get',
          headers,
          url: `${SLACK_URL}auth.test`,
          connectorUsageCollector,
        });
        if (authTestResult.data.ok && authTestResult.data.user_id) {
          authenticatedUserId = authTestResult.data.user_id;
          authenticatedUsername = authTestResult.data.user;
          logger.info(
            `[Slack Service] Authenticated user ID: ${authenticatedUserId}, username: ${authenticatedUsername}`
          );
        } else {
          logger.warn(
            `[Slack Service] auth.test did not return user_id. Response: ${JSON.stringify(
              authTestResult.data
            )}`
          );
        }
      } catch (error) {
        logger.warn(
          `[Slack Service] Failed to get authenticated user info from auth.test: ${error}. Mentions will not be searched.`
        );
      }

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

      // Fetch user info for authenticated user so we have their name available
      if (authenticatedUserId) {
        try {
          await throttleRequest();
          const authUserInfoResult = await getUserInfo({ user: authenticatedUserId });
          if (
            authUserInfoResult.status === 'ok' &&
            authUserInfoResult.data?.ok &&
            authUserInfoResult.data.user
          ) {
            const user = authUserInfoResult.data.user;
            userMap.set(user.id, {
              name: user.name,
              real_name: user.profile?.display_name || user.real_name || user.name,
            });
            logger.debug(
              `[Slack Service] Fetched user info for authenticated user: ${user.name} (${user.id})`
            );
          }
        } catch (error) {
          logger.debug(
            `[Slack Service] Error fetching user info for authenticated user: ${error}. Continuing.`
          );
        }
      }

      // Set to track messages that mention the user (channel_id + timestamp as key)
      const mentionedMessages = new Set<string>();
      // Store search results directly when searchAllChannels is true (optimization)
      const searchResultMatches: Array<{
        channel: { id: string; name: string };
        message: SlackMessage;
        permalink?: string;
      }> = [];
      // Track unique channel IDs from search results
      const channelsWithMentions = new Set<string>();

      // Helper function to extract all user IDs mentioned in message text
      // This is used for both verification and building the mentions array
      const extractMentionedUserIds = (text: string | undefined): string[] => {
        if (!text) return [];
        const mentionedUserIds: string[] = [];
        // Match patterns like <@USER_ID> or <@USER_ID|username>
        const mentionPattern = /<@([A-Z0-9]+)(?:\|[^>]+)?>/g;
        let match;
        while ((match = mentionPattern.exec(text)) !== null) {
          const userId = match[1];
          if (userId && !mentionedUserIds.includes(userId)) {
            mentionedUserIds.push(userId);
          }
        }
        return mentionedUserIds;
      };

      // Helper function to check if a specific user ID is mentioned in message text
      // This is used to filter out false positives from Slack's search API
      const isUserMentionedInText = (text: string | undefined, userId: string): boolean => {
        if (!text || !userId) return false;
        const mentionedUserIds = extractMentionedUserIds(text);
        return mentionedUserIds.includes(userId);
      };

      // Search for messages that mention the authenticated user using search.messages API
      if (!authenticatedUserId) {
        logger.warn(
          `[Slack Service] ⚠️ Cannot search for mentions: authenticatedUserId is not available. Search will be skipped.`
        );
      }

      if (authenticatedUserId) {
        try {
          // Convert since timestamp to date string for search query
          const sinceDate = new Date(since * 1000);
          const sinceDateStr = sinceDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          const nowDate = new Date();
          const nowDateStr = nowDate.toISOString().split('T')[0]; // YYYY-MM-DD format

          // Build search query: Use <@USER_ID> format (verified to work with Slack API)
          // Note: We verify mentions in message text as a backup filter to catch false positives
          // Alternative syntaxes that may work (untested): mentions:USER_ID or mentions:<@USER_ID>
          const mentionQueryUserId = `<@${authenticatedUserId}>`;
          const searchQuery = `${mentionQueryUserId} after:${sinceDateStr} before:${nowDateStr}`;
          logger.info(`[Slack Service] ===== SEARCH CONFIGURATION =====`);
          logger.info(`[Slack Service] Authenticated User ID: ${authenticatedUserId}`);
          logger.info(
            `[Slack Service] Authenticated Username: ${authenticatedUsername || 'NOT AVAILABLE'}`
          );
          logger.info(`[Slack Service] Since timestamp: ${since} (${sinceDate.toISOString()})`);
          logger.info(`[Slack Service] Since date string: ${sinceDateStr}`);
          logger.info(`[Slack Service] Now date string: ${nowDateStr}`);
          logger.info(`[Slack Service] Mention query format: ${mentionQueryUserId}`);
          logger.info(`[Slack Service] Full search query: ${searchQuery}`);
          logger.info(
            `[Slack Service] Note: Results will be verified to ensure authenticated user is actually mentioned`
          );
          logger.info(`[Slack Service] ===== STARTING SEARCH =====`);

          // Search for messages (paginate through results)
          let searchPage = 1;
          let hasMoreSearchResults = true;
          // Search for mentions from all channels (always done for catchups)
          const maxSearchPages = 10; // Limit pages to avoid excessive API calls
          let totalMatchesFound = 0;
          let totalFilteredMatches = 0; // Track total filtered matches across all pages

          logger.info(
            `[Slack Service] Will search up to ${maxSearchPages} pages (${
              maxSearchPages * 100
            } max results)`
          );

          while (hasMoreSearchResults && searchPage <= maxSearchPages) {
            logger.info(`[Slack Service] Fetching search page ${searchPage}/${maxSearchPages}...`);
            await throttleRequest();
            const searchResult = await searchMessages({
              query: searchQuery,
              count: 100,
              page: searchPage,
            });

            logger.info(
              `[Slack Service] Search page ${searchPage} response status: ${searchResult.status}`
            );
            if (searchResult.data) {
              logger.info(
                `[Slack Service] Search page ${searchPage} response ok: ${searchResult.data.ok}`
              );
              if (searchResult.data.error) {
                logger.warn(
                  `[Slack Service] Search page ${searchPage} error: ${searchResult.data.error}`
                );
              }
              if (searchResult.data.messages) {
                logger.info(
                  `[Slack Service] Search page ${searchPage} total matches: ${
                    searchResult.data.messages.total || 0
                  }`
                );
                logger.info(
                  `[Slack Service] Search page ${searchPage} matches in this page: ${
                    searchResult.data.messages.matches?.length || 0
                  }`
                );
                if (searchResult.data.messages.pagination) {
                  logger.info(
                    `[Slack Service] Search page ${searchPage} pagination: page ${searchResult.data.messages.pagination.page}/${searchResult.data.messages.pagination.page_count}, per_page: ${searchResult.data.messages.pagination.per_page}`
                  );
                }
                if (searchResult.data.messages.paging) {
                  logger.info(
                    `[Slack Service] Search page ${searchPage} paging: page ${searchResult.data.messages.paging.page}/${searchResult.data.messages.paging.pages}, count: ${searchResult.data.messages.paging.count}`
                  );
                }
              }
            }

            // Handle retry results (rate limiting)
            if (searchResult.status === 'error' && searchResult.retry) {
              const waitMs = waitForRetry(searchResult.retry);
              const waitSeconds = Math.ceil(waitMs / 1000);
              logger.warn(`Rate limited while searching messages, waiting ${waitSeconds} seconds`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue; // Retry the same page
            }

            if (
              searchResult.status === 'ok' &&
              searchResult.data?.ok &&
              searchResult.data.messages?.matches
            ) {
              const matches = searchResult.data.messages.matches || [];
              totalMatchesFound += matches.length;
              logger.info(
                `[Slack Service] ✓ Search page ${searchPage}: Found ${matches.length} messages (total so far: ${totalMatchesFound})`
              );

              // Process matches
              let validMatches = 0;
              let invalidMatches = 0;
              let filteredMatches = 0; // Track matches filtered out due to false positives (this page)
              logger.info(
                `[Slack Service] Processing ${matches.length} matches from search page ${searchPage}`
              );
              for (const match of matches) {
                if (match.channel?.id && match.ts) {
                  // Log the raw match for debugging
                  logger.info(
                    `[Slack Service] ===== RAW SEARCH MATCH =====\n` +
                      `Channel: ${match.channel.name || match.channel.id} (${match.channel.id})\n` +
                      `Timestamp: ${match.ts}\n` +
                      `User: ${match.user || 'unknown'}\n` +
                      `Full text: ${match.text || '(empty)'}\n` +
                      `Authenticated User ID: ${authenticatedUserId}\n` +
                      `========================================`
                  );

                  // Extract all mentioned user IDs from the message text for logging
                  const extractedMentions = extractMentionedUserIds(match.text);
                  logger.info(
                    `[Slack Service] Extracted mentions from text: [${extractedMentions.join(
                      ', '
                    )}]`
                  );

                  // Verify that the authenticated user is actually mentioned in the message text
                  // This filters out false positives from Slack's search API
                  const isActuallyMentioned = isUserMentionedInText(
                    match.text,
                    authenticatedUserId
                  );

                  logger.info(
                    `[Slack Service] Verification result: isActuallyMentioned=${isActuallyMentioned} (looking for user ${authenticatedUserId})`
                  );

                  if (!isActuallyMentioned) {
                    filteredMatches++;
                    logger.warn(
                      `[Slack Service] ❌ FILTERED OUT FALSE POSITIVE\n` +
                        `Channel: ${match.channel.name || match.channel.id} (${
                          match.channel.id
                        })\n` +
                        `Timestamp: ${match.ts}\n` +
                        `User: ${match.user || 'unknown'}\n` +
                        `Message text: ${match.text || '(empty)'}\n` +
                        `Extracted mentions: [${extractedMentions.join(', ')}]\n` +
                        `Authenticated user ${authenticatedUserId} NOT found in mentions\n` +
                        `This message was returned by Slack search but does not actually mention the authenticated user`
                    );
                    continue; // Skip this match - it's a false positive
                  }

                  validMatches++;
                  // Use channel_id:ts as unique key
                  const messageKey = `${match.channel.id}:${match.ts}`;
                  mentionedMessages.add(messageKey);
                  channelsWithMentions.add(match.channel.id);

                  logger.info(
                    `[Slack Service] ✅ VALID MENTION MATCH\n` +
                      `Channel: ${match.channel.name || match.channel.id} (${match.channel.id})\n` +
                      `Timestamp: ${match.ts}\n` +
                      `User: ${match.user || 'unknown'}\n` +
                      `Message text: ${match.text || '(empty)'}\n` +
                      `Extracted mentions: [${extractedMentions.join(', ')}]\n` +
                      `Authenticated user ${authenticatedUserId} confirmed in mentions`
                  );

                  // Store search results (mentions from all channels)
                  // These will be combined with allowed channel messages
                  searchResultMatches.push({
                    channel: {
                      id: match.channel.id,
                      name: match.channel.name || match.channel.id,
                    },
                    message: {
                      text: match.text,
                      user: match.user || 'unknown',
                      ts: match.ts,
                    },
                    permalink: match.permalink, // Capture permalink from search results
                  });
                } else {
                  invalidMatches++;
                  logger.warn(
                    `[Slack Service] Invalid match on page ${searchPage}: missing channel.id or ts. channel=${JSON.stringify(
                      match.channel
                    )}, ts=${match.ts}`
                  );
                }
              }
              totalFilteredMatches += filteredMatches; // Accumulate filtered matches
              logger.info(
                `[Slack Service] Page ${searchPage} processed: ${validMatches} valid, ${invalidMatches} invalid, ${filteredMatches} filtered (false positives)`
              );

              // Check if there are more pages
              const pagination = searchResult.data.messages.pagination;
              const paging = searchResult.data.messages.paging;
              if (pagination) {
                hasMoreSearchResults = searchPage < pagination.page_count;
                logger.info(
                  `[Slack Service] Pagination info: page ${searchPage} of ${pagination.page_count}, hasMore=${hasMoreSearchResults}`
                );
              } else if (paging) {
                hasMoreSearchResults = searchPage < paging.pages;
                logger.info(
                  `[Slack Service] Paging info: page ${searchPage} of ${paging.pages}, hasMore=${hasMoreSearchResults}`
                );
              } else {
                hasMoreSearchResults = false;
                logger.info(`[Slack Service] No pagination info available, assuming no more pages`);
              }

              searchPage++;
            } else {
              logger.warn(
                `[Slack Service] ✗ Search page ${searchPage} failed or returned no results`
              );
              logger.warn(
                `[Slack Service] Status: ${searchResult.status}, OK: ${
                  searchResult.data?.ok
                }, Error: ${searchResult.data?.error || 'none'}`
              );
              // Log full error response for debugging
              if (searchResult.status === 'error') {
                const serviceMessage = (searchResult as any).serviceMessage;
                logger.warn(
                  `[Slack Service] Full error response structure: ${JSON.stringify(
                    {
                      status: searchResult.status,
                      ok: searchResult.data?.ok,
                      error: searchResult.data?.error,
                      serviceMessage,
                      retry: (searchResult as any).retry,
                      dataKeys: searchResult.data ? Object.keys(searchResult.data) : [],
                    },
                    null,
                    2
                  )}`
                );
                if (serviceMessage) {
                  logger.warn(`[Slack Service] Service message: ${serviceMessage}`);

                  // Check for missing_scope error - this is critical for search.messages
                  if (
                    serviceMessage === 'missing_scope' ||
                    serviceMessage.includes('missing_scope')
                  ) {
                    logger.error(
                      `[Slack Service] ⚠️ MISSING SCOPE ERROR: The search.messages API requires 'search:read' scope. ` +
                        `Current UserToken connector does not have this scope. ` +
                        `Please add 'search:read' scope to your Slack UserToken connector.`
                    );

                    // If search fails, log warning but continue with channel fetch
                    // Mentions search is nice-to-have, but we can still fetch allowed channels
                    logger.warn(
                      `[Slack Service] Cannot search for mentions: missing 'search:read' scope. ` +
                        `Will continue with allowed channels only. To enable mentions search, add 'search:read' scope to your Slack UserToken connector.`
                    );
                  }
                }
              }
              if (searchResult.data?.messages) {
                logger.warn(
                  `[Slack Service] Messages object exists but no matches. Total: ${
                    searchResult.data.messages.total || 0
                  }, Matches array: ${searchResult.data.messages.matches ? 'exists' : 'missing'}`
                );
              } else {
                logger.warn(`[Slack Service] No messages object in response`);
              }
              hasMoreSearchResults = false;
            }
          }

          logger.info(`[Slack Service] ===== SEARCH COMPLETE =====`);
          logger.info(`[Slack Service] Total pages searched: ${searchPage - 1}`);
          logger.info(`[Slack Service] Total matches found across all pages: ${totalMatchesFound}`);
          logger.info(
            `[Slack Service] Total filtered matches (false positives): ${totalFilteredMatches}`
          );
          logger.info(`[Slack Service] Unique messages (deduplicated): ${mentionedMessages.size}`);
          logger.info(
            `[Slack Service] Unique channels with mentions: ${channelsWithMentions.size}`
          );
          logger.info(
            `[Slack Service] Search result matches stored: ${searchResultMatches.length}`
          );
          if (channelsWithMentions.size > 0) {
            logger.info(
              `[Slack Service] Channels with mentions: ${Array.from(channelsWithMentions)
                .slice(0, 10)
                .join(', ')}${
                channelsWithMentions.size > 10
                  ? ` ... and ${channelsWithMentions.size - 10} more`
                  : ''
              }`
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(
            `[Slack Service] Error searching for messages mentioning user: ${errorMessage}`
          );

          // If search fails, log warning but continue with channel fetch
          // Mentions search is nice-to-have, but we can still fetch allowed channels
          const isMissingScope = errorMessage.includes('missing_scope');
          if (isMissingScope) {
            logger.warn(
              `[Slack Service] ⚠️ Cannot search for mentions: missing 'search:read' scope. ` +
                `Will continue with allowed channels only. To enable mentions search, add 'search:read' scope to your Slack UserToken connector.`
            );
          } else {
            logger.info(
              `[Slack Service] Search for mentions failed, continuing with regular channel fetch`
            );
          }
        }
      }

      // Always fetch allowed channels AND include mentions from search (combine both)
      // This allows catchups to show: (1) messages from allowed channels + (2) mentions from all channels
      // We never skip channel fetch - we always combine both

      // Step 1: Fetch conversations for each type
      logger.debug(`[Slack Service] Step 1: Fetching conversations for types: ${types.join(', ')}`);

      // Check if we should use allowed channels (optimization: fetch only specific channels)
      // Use allowed channels if they're configured
      const hasAllowedChannels = allowedChannelIds && allowedChannelIds.length > 0;
      const allChannels: SlackConversation[] = [];

      // Map to store DM participant user IDs (conversation ID -> array of user IDs)
      // For 'im' (1-on-1 DM): array with 1 user ID (the other participant)
      // For 'mpim' (group DM): array with multiple user IDs (all participants except authenticated user)
      const dmParticipantsMap = new Map<string, string[]>();

      // Helper function to fetch conversations for a type using conversations.list
      const fetchConversationsForType = async (
        type: string,
        maxResults?: number
      ): Promise<SlackConversation[]> => {
        let cursor: string | undefined;
        let hasMore = true;
        let typePageCount = 0;
        const maxTypePages = 50; // Safety limit
        const typeChannels: SlackConversation[] = [];

        while (hasMore && typePageCount < maxTypePages) {
          // Stop early if we've reached the max results limit
          if (maxResults && typeChannels.length >= maxResults) {
            break;
          }

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
            typeChannels.push(...conversationsResult.data.channels);
            cursor = conversationsResult.data.response_metadata?.next_cursor;
            hasMore = !!cursor;

            // Stop early if we've reached the max results limit after adding this page
            if (maxResults && typeChannels.length >= maxResults) {
              // Trim to exactly maxResults
              const trimmed = typeChannels.slice(0, maxResults);
              return trimmed;
            }
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
        return typeChannels;
      };

      // Separate channel types from DM types
      // Channel types can use the optimized path when allowedChannels is configured
      // DM types always use the standard path (can't be in allowedChannels)
      const channelTypes = types.filter((t) => t === 'public_channel' || t === 'private_channel');
      const dmTypes = types.filter((t) => t === 'im' || t === 'mpim');

      // Process channel types (public_channel, private_channel)
      // SKIP entirely if using search results only - we already have the messages from search.messages
      if (channelTypes.length > 0) {
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
          // STANDARD PATH: Fetch all channels using conversations.list
          // BUT SKIP if searchAllChannels is true (we're using search results only)
          if (params.searchAllChannels) {
            logger.info(
              `[Slack Service] searchAllChannels=true: Skipping channel fetch, using search.messages results only`
            );
            // Don't fetch channels - we'll use search results
          } else {
            logger.info(
              `[Slack Service] No allowed channels configured. Will fetch from ALL channel conversations (this may be slow for large workspaces).`
            );

            for (const type of channelTypes) {
              const typeChannels = await fetchConversationsForType(type);
              allChannels.push(...typeChannels);
            }
          }
        }
      }

      // Process DM types (im, mpim) - always use standard path since DMs can't be in allowedChannels
      // Limit the number of DMs to avoid rate limiting (users can have hundreds/thousands of DMs)
      // Each DM requires a history fetch, so we limit to stay well under rate limits
      // SKIP DMs if using search results only (search.messages doesn't return DMs by default)
      const maxDMsToProcess = 20; // Limit to most recent 20 DMs per type to stay within rate limits
      if (dmTypes.length > 0) {
        logger.info(
          `[Slack Service] Fetching DMs (${dmTypes.join(
            ', '
          )}) using standard path (DMs are not included in allowed channels). Limiting to ${maxDMsToProcess} most recent DMs to avoid rate limits.`
        );
        for (const type of dmTypes) {
          // Pass maxResults to stop fetching once we have 20 DMs (conversations.list returns most recent first)
          const typeChannels = await fetchConversationsForType(type, maxDMsToProcess);
          allChannels.push(...typeChannels);
          logger.info(`[Slack Service] Found ${typeChannels.length} ${type} conversations`);
        }
      }

      logger.info(
        `[Slack Service] Step 1 complete: ${allChannels.length} total conversations found`
      );

      // Log channel configuration for debugging
      if (hasAllowedChannels) {
        logger.info(
          `==> [Slack Service] ⚠️ allowedChannels is configured (${allowedChannelIds.length} channels). Regular channel messages will only be fetched from these channels. Mentions are searched across ALL channels via search.messages API.`
        );
        logger.info(`==> [Slack Service] Allowed channels: ${allowedChannelIds.join(', ')}`);
      } else {
        logger.info(
          `==> [Slack Service] ✓ No allowedChannels configured. Fetching messages from ALL accessible channels. Mentions are also searched across ALL channels.`
        );
      }

      // Fetch participant info for DMs (im and mpim) to enable user attribution
      // Identify DMs by checking flags OR by channel ID prefix:
      // - 'D' prefix = 1-on-1 DMs (im)
      // - 'C' prefix = group DMs (mpim)
      const dmChannels = allChannels.filter(
        (ch) =>
          ch.is_im ||
          ch.is_mpim ||
          (!ch.name && ch.id && (ch.id.startsWith('D') || ch.id.startsWith('C')))
      );
      const allParticipantIds = new Set<string>(); // Collect all unique participant IDs

      if (dmChannels.length > 0) {
        logger.debug(`[Slack Service] Fetching participant info for ${dmChannels.length} DMs`);
        for (const dmChannel of dmChannels) {
          try {
            const participantIds: string[] = [];

            // For group DMs (mpim), use conversations.members API
            // Group DMs can have IDs starting with 'C', but we check is_mpim flag to be sure
            if (dmChannel.is_mpim || (dmChannel.id.startsWith('C') && !dmChannel.name)) {
              // Throttle to avoid rate limits
              await throttleRequest();

              // Fetch members using conversations.members API
              let cursor: string | undefined;
              let hasMore = true;
              const allMembers: string[] = [];

              while (hasMore) {
                const membersResult = await getConversationsMembers({
                  channel: dmChannel.id,
                  cursor,
                  limit: 100,
                });

                // Handle retry results (rate limiting)
                if (membersResult.status === 'error' && membersResult.retry) {
                  const waitMs = waitForRetry(membersResult.retry);
                  const waitSeconds = Math.ceil(waitMs / 1000);
                  logger.warn(
                    `Rate limited while fetching members for group DM ${dmChannel.id}, waiting ${waitSeconds} seconds`
                  );
                  await new Promise((resolve) => setTimeout(resolve, waitMs));
                  // Retry the same request
                  continue;
                }

                if (
                  membersResult.status === 'ok' &&
                  membersResult.data?.ok &&
                  membersResult.data.members
                ) {
                  allMembers.push(...membersResult.data.members);
                  cursor = membersResult.data.response_metadata?.next_cursor;
                  hasMore = !!cursor;
                } else {
                  logger.debug(
                    `[Slack Service] Failed to fetch members for group DM ${dmChannel.id}: ${
                      membersResult.data?.error || 'unknown error'
                    }`
                  );
                  hasMore = false;
                }
              }

              if (allMembers.length > 0) {
                participantIds.push(...allMembers);
                allMembers.forEach((id: string) => allParticipantIds.add(id));
              }
            } else {
              // For 1-on-1 DMs (channels starting with 'D'), use conversations.info
              // Throttle to avoid rate limits
              await throttleRequest();
              const infoResult = await validChannelId(dmChannel.id);

              if (infoResult.status === 'ok' && infoResult.data?.ok && infoResult.data.channel) {
                const channelInfo = infoResult.data.channel as any; // Type assertion to access DM-specific fields

                // For 'im' (1-on-1 DM), use the 'user' field
                if (channelInfo.user) {
                  participantIds.push(channelInfo.user);
                  allParticipantIds.add(channelInfo.user);
                }
              }
            }

            if (participantIds.length > 0) {
              dmParticipantsMap.set(dmChannel.id, participantIds);
              logger.debug(
                `[Slack Service] Stored participant IDs for DM ${
                  dmChannel.id
                }: ${participantIds.join(', ')}`
              );
            } else {
              logger.debug(`[Slack Service] No participant IDs found for DM ${dmChannel.id}`);
            }
          } catch (error) {
            logger.debug(
              `[Slack Service] Failed to fetch participant info for DM ${dmChannel.id}: ${error}. Continuing without participant info.`
            );
            // Continue without participant info for this DM - not critical
          }
        }
        logger.info(
          `[Slack Service] Fetched participant info for ${dmParticipantsMap.size}/${dmChannels.length} DMs`
        );
      }

      // Fetch user info for DM participants using getUserInfo (targeted fetching)
      if (allParticipantIds.size > 0) {
        const missingParticipantIds = Array.from(allParticipantIds).filter(
          (id) => !userMap.has(id)
        );
        if (missingParticipantIds.length > 0) {
          logger.debug(
            `[Slack Service] Fetching user info for ${missingParticipantIds.length} DM participants using users.info`
          );
          let fetchedCount = 0;
          for (const participantId of missingParticipantIds) {
            try {
              await throttleRequest();
              const userInfoResult = await getUserInfo({ user: participantId });

              // Handle retry results (rate limiting)
              if (userInfoResult.status === 'error' && userInfoResult.retry) {
                const waitMs = waitForRetry(userInfoResult.retry);
                const waitSeconds = Math.ceil(waitMs / 1000);
                logger.warn(
                  `Rate limited while fetching user info for ${participantId}, waiting ${waitSeconds} seconds`
                );
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                // Retry the same request
                const retryResult = await getUserInfo({ user: participantId });
                if (retryResult.status === 'ok' && retryResult.data?.ok && retryResult.data.user) {
                  const user = retryResult.data.user;
                  userMap.set(user.id, {
                    name: user.name,
                    real_name: user.profile?.display_name || user.real_name || user.name,
                  });
                  fetchedCount++;
                }
              } else if (
                userInfoResult.status === 'ok' &&
                userInfoResult.data?.ok &&
                userInfoResult.data.user
              ) {
                const user = userInfoResult.data.user;
                userMap.set(user.id, {
                  name: user.name,
                  real_name: user.profile?.display_name || user.real_name || user.name,
                });
                fetchedCount++;
              } else {
                logger.debug(
                  `[Slack Service] Failed to fetch user info for participant ${participantId}: ${
                    userInfoResult.data?.error || 'unknown error'
                  }`
                );
              }
            } catch (error) {
              logger.debug(
                `[Slack Service] Error fetching user info for participant ${participantId}: ${error}. Continuing without this participant's name.`
              );
              // Continue to next participant - not critical
            }
          }
          logger.info(
            `[Slack Service] Fetched user info for ${fetchedCount}/${missingParticipantIds.length} DM participants`
          );
        }
      }

      // Use allChannels as filteredChannels (already filtered if using allowed channels)
      const filteredChannels = allChannels;

      // Step 2: Fetch messages from each channel
      // If using search results only, use those directly instead of fetching channel history
      const allMessages: Array<{
        channel: { id: string; name: string };
        message: SlackMessage;
        thread_replies?: Array<{ user: string; text: string; ts: string }>;
        permalink?: string;
      }> = [];

      // Always fetch messages from allowed channels
      // We'll also include mentions from search results (if any) to combine both
      logger.info(
        `[Slack Service] Step 2: Fetching messages from ${filteredChannels.length} channels`
      );
      if (searchResultMatches.length > 0) {
        logger.info(
          `[Slack Service] Will also include ${searchResultMatches.length} mentions from all channels (found via search.messages)`
        );
      }

      // Cache for thread replies to avoid fetching the same thread multiple times
      const threadReplyCache = new Map<string, Array<{ user: string; text: string; ts: string }>>();

      for (let i = 0; i < filteredChannels.length; i++) {
        const channel = filteredChannels[i];
        const channelDisplayName = channel.name || channel.id; // DMs might not have names
        logger.debug(
          `[Slack Service] Processing channel ${i + 1}/${
            filteredChannels.length
          }: ${channelDisplayName} (${channel.id})`
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
              const channelDisplayName = channel.name || channel.id; // DMs might not have names
              logger.warn(
                `Rate limited while fetching messages from ${channelDisplayName}, waiting ${waitSeconds} seconds`
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

      // When doing regular catchup, also include mentions from all channels (found via search.messages)
      // This allows regular catchups to show: (1) messages from allowed channels + (2) mentions from all channels
      if (searchResultMatches.length > 0) {
        logger.info(
          `[Slack Service] Adding ${searchResultMatches.length} mentions from all channels (found via search.messages) to the results`
        );
        allMessages.push(...searchResultMatches);
      }
      logger.info(
        `[Slack Service] Step 2 complete: ${allMessages.length} total messages from ${filteredChannels.length} channels + ${searchResultMatches.length} mentions from all channels`
      );

      // Fetch user info for message authors, thread reply authors, and mentioned users
      // Note: extractMentionedUserIds is already defined earlier in the function
      const allMessageUserIds = new Set<string>();
      const allMentionedUserIds = new Set<string>();

      for (const item of allMessages) {
        if (item.message.user) {
          allMessageUserIds.add(item.message.user);
        }
        if (item.thread_replies) {
          for (const reply of item.thread_replies) {
            if (reply.user) {
              allMessageUserIds.add(reply.user);
            }
          }
        }
        // Extract mentioned user IDs from message text
        const mentionedUserIds = extractMentionedUserIds(item.message.text);
        mentionedUserIds.forEach((userId) => allMentionedUserIds.add(userId));

        // Extract mentioned user IDs from thread replies
        if (item.thread_replies) {
          for (const reply of item.thread_replies) {
            const replyMentionedUserIds = extractMentionedUserIds(reply.text);
            replyMentionedUserIds.forEach((userId) => allMentionedUserIds.add(userId));
          }
        }
      }

      // Combine all user IDs we need to fetch
      const allUserIdsToFetch = new Set<string>([
        ...Array.from(allMessageUserIds),
        ...Array.from(allMentionedUserIds),
      ]);
      const missingUserIds = Array.from(allUserIdsToFetch).filter((id) => !userMap.has(id));

      if (missingUserIds.length > 0) {
        logger.debug(
          `[Slack Service] Fetching user info for ${missingUserIds.length} users (message authors and mentioned users) using users.info`
        );
        let fetchedCount = 0;
        for (const userId of missingUserIds) {
          try {
            await throttleRequest();
            const userInfoResult = await getUserInfo({ user: userId });

            // Handle retry results (rate limiting)
            if (userInfoResult.status === 'error' && userInfoResult.retry) {
              const waitMs = waitForRetry(userInfoResult.retry);
              const waitSeconds = Math.ceil(waitMs / 1000);
              logger.warn(
                `Rate limited while fetching user info for ${userId}, waiting ${waitSeconds} seconds`
              );
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              // Retry the same request
              const retryResult = await getUserInfo({ user: userId });
              if (retryResult.status === 'ok' && retryResult.data?.ok && retryResult.data.user) {
                const user = retryResult.data.user;
                userMap.set(user.id, {
                  name: user.name,
                  real_name: user.profile?.display_name || user.real_name || user.name,
                });
                fetchedCount++;
              }
            } else if (
              userInfoResult.status === 'ok' &&
              userInfoResult.data?.ok &&
              userInfoResult.data.user
            ) {
              const user = userInfoResult.data.user;
              userMap.set(user.id, {
                name: user.name,
                real_name: user.profile?.display_name || user.real_name || user.name,
              });
              fetchedCount++;
            } else {
              logger.debug(
                `[Slack Service] Failed to fetch user info for message author ${userId}: ${
                  userInfoResult.data?.error || 'unknown error'
                }`
              );
            }
          } catch (error) {
            logger.debug(
              `[Slack Service] Error fetching user info for message author ${userId}: ${error}. Continuing without this user's name.`
            );
            // Continue to next user - not critical
          }
        }
        logger.info(
          `[Slack Service] Fetched user info for ${fetchedCount}/${missingUserIds.length} users (message authors and mentioned users)`
        );
      }

      // Format results
      logger.debug(`[Slack Service] Formatting ${allMessages.length} messages`);
      // Helper function to format Slack mentions: <@USER_ID|username> -> @username
      const formatSlackMentions = (text: string | undefined): string => {
        if (!text) return '';
        // Replace <@USER_ID|username> with @username
        // Also handle <@USER_ID> (without username) -> @USER_ID
        return text.replace(/<@([A-Z0-9]+)(?:\|([^>]+))?>/g, (match, userId, username) => {
          return username ? `@${username}` : `@${userId}`;
        });
      };

      // Helper function to get permalink for a message using chat.getPermalink API
      // Cache permalinks to avoid duplicate API calls
      const permalinkCache = new Map<string, string>();
      const getPermalink = async (
        channelId: string,
        messageTs: string
      ): Promise<string | undefined> => {
        const cacheKey = `${channelId}:${messageTs}`;
        if (permalinkCache.has(cacheKey)) {
          return permalinkCache.get(cacheKey);
        }

        try {
          await throttleRequest();
          const queryParams = new URLSearchParams({
            channel: channelId,
            message_ts: messageTs,
          });
          const url = `${SLACK_URL}chat.getPermalink?${queryParams.toString()}`;
          const result: AxiosResponse<{ ok: boolean; permalink?: string; error?: string }> =
            await request({
              axios: axiosInstance,
              method: 'get',
              url,
              logger,
              headers,
              configurationUtilities,
              connectorUsageCollector,
            });

          if (result.data.ok && result.data.permalink) {
            permalinkCache.set(cacheKey, result.data.permalink);
            return result.data.permalink;
          }
        } catch (error) {
          logger.debug(
            `[Slack Service] Failed to get permalink for ${channelId}:${messageTs}: ${error}`
          );
        }
        return undefined;
      };

      // Batch fetch permalinks for messages that don't have them (from channel history)
      // Only fetch for messages that don't already have permalinks (from search results)
      const messagesNeedingPermalinks: Array<{
        channelId: string;
        messageTs: string;
        index: number;
      }> = [];
      allMessages.forEach((item, index) => {
        // Check if this is from search results (has permalink) or channel history (needs permalink)
        const hasPermalink = 'permalink' in item && item.permalink;
        if (!hasPermalink) {
          messagesNeedingPermalinks.push({
            channelId: item.channel.id,
            messageTs: item.message.ts,
            index,
          });
        }
      });

      // Fetch permalinks in batches (with throttling)
      if (messagesNeedingPermalinks.length > 0) {
        logger.debug(
          `[Slack Service] Fetching permalinks for ${messagesNeedingPermalinks.length} messages from channel history`
        );
        for (const { channelId, messageTs, index } of messagesNeedingPermalinks) {
          const permalink = await getPermalink(channelId, messageTs);
          if (permalink) {
            // Store permalink in the message item
            const item = allMessages[index];
            if (item) {
              item.permalink = permalink;
            }
          }
        }
      }

      const formattedMessages = allMessages.map((item) => {
        const userInfo = userMap.get(item.message.user);

        // Extract all mentioned user IDs from message text
        const mentionedUserIds = extractMentionedUserIds(item.message.text);

        // Check if this message was found via search.messages (which searches for mentions of authenticated user)
        const messageKey = `${item.channel.id}:${item.message.ts}`;
        const isMentionedViaSearch = mentionedMessages.has(messageKey);

        // Build mentions array: include all users mentioned in the message text
        // If message was found via search.messages AND verified (is in mentionedMessages),
        // ensure the authenticated user is included in mentions (they were verified to be mentioned)
        const messageMentionedUserIds = new Set<string>(mentionedUserIds);

        // If this message was found via search and verified to mention the authenticated user,
        // ensure they're included in the mentions array (even if extraction missed them somehow)
        if (isMentionedViaSearch && authenticatedUserId) {
          // This message was verified during search processing to mention the authenticated user
          // So we should include them in the mentions array
          messageMentionedUserIds.add(authenticatedUserId);

          // Log if extraction didn't find them (shouldn't happen, but helps with debugging)
          if (!mentionedUserIds.includes(authenticatedUserId)) {
            logger.warn(
              `[Slack Service] ⚠️ WARNING: Message ${messageKey} is in mentionedMessages (verified mention) but authenticated user ${authenticatedUserId} was not found in extracted mentions. Adding them anyway since verification confirmed the mention.`
            );
          }
        }

        // Build mentions array with user info
        const mentions = Array.from(messageMentionedUserIds)
          .map((userId) => {
            const mentionedUserInfo = userMap.get(userId);
            return {
              user_id: userId,
              user_name: mentionedUserInfo?.real_name || mentionedUserInfo?.name || userId,
              user_real_name: mentionedUserInfo?.real_name,
            };
          })
          .filter((mention) => mention.user_id); // Filter out any invalid mentions

        // Determine channel display name
        let channelDisplayName = item.channel.name || item.channel.id;

        // If this is a DM, include participant names in the channel name
        const participantIds = dmParticipantsMap.get(item.channel.id);
        if (participantIds && participantIds.length > 0) {
          // Get participant names from userMap
          const participantNames = participantIds
            .map((userId) => {
              const participantInfo = userMap.get(userId);
              const name = participantInfo?.real_name || participantInfo?.name;
              if (!name && userId) {
                logger.debug(
                  `[Slack Service] Missing user info for DM participant ${userId} in channel ${item.channel.id}`
                );
              }
              return name || userId;
            })
            .filter((name) => name && name !== 'unknown'); // Remove any undefined/null/unknown names

          if (participantNames.length > 0) {
            // Filter out the authenticated user's ID if it appears in the list (for group DMs)
            // We can't easily identify the authenticated user, so we'll include all participants
            if (participantNames.length === 1) {
              channelDisplayName = `DM with ${participantNames[0]}`;
            } else {
              channelDisplayName = `DM with ${participantNames.join(', ')}`;
            }
            logger.debug(
              `[Slack Service] Formatted DM channel ${item.channel.id} as "${channelDisplayName}" with ${participantNames.length} participant(s)`
            );
          } else {
            // Fallback if we don't have participant names yet
            channelDisplayName = `DM (${participantIds.length} participant${
              participantIds.length > 1 ? 's' : ''
            })`;
            logger.debug(
              `[Slack Service] DM channel ${
                item.channel.id
              } has participant IDs but no names found: ${participantIds.join(', ')}`
            );
          }
        } else {
          // Check if this might be a DM that we didn't populate in dmParticipantsMap
          // This could happen if the channel wasn't in dmChannels list or participant fetch failed
          const channelId = item.channel.id;
          const mightBeDM = !item.channel.name || channelId.startsWith('D');
          if (mightBeDM) {
            logger.debug(
              `[Slack Service] Message from channel ${channelId} (might be DM) but not found in dmParticipantsMap`
            );
          }
        }

        // Get permalink for this message (from search results or fetched via API)
        const messagePermalink = item.permalink;

        // Extract mentions from thread replies
        const threadReplies = (item.thread_replies || []).map((reply) => {
          const replyUserInfo = userMap.get(reply.user);

          // Extract mentioned user IDs from reply text
          const replyMentionedUserIds = extractMentionedUserIds(reply.text);

          // Build mentions array with user info for reply
          const replyMentions = replyMentionedUserIds
            .map((userId) => {
              const mentionedUserInfo = userMap.get(userId);
              return {
                user_id: userId,
                user_name: mentionedUserInfo?.real_name || mentionedUserInfo?.name || userId,
                user_real_name: mentionedUserInfo?.real_name,
              };
            })
            .filter((mention) => mention.user_id); // Filter out any invalid mentions

          return {
            ...reply,
            text: formatSlackMentions(reply.text),
            user_name: replyUserInfo?.name || reply.user || 'unknown',
            user_real_name: replyUserInfo?.real_name,
            mentions: replyMentions,
            // Thread replies use the same permalink as the parent message
            permalink: messagePermalink,
          };
        });

        return {
          channel: channelDisplayName,
          channel_id: item.channel.id,
          text: formatSlackMentions(item.message.text),
          user: item.message.user || 'unknown',
          user_name: userInfo?.name || item.message.user || 'unknown',
          user_real_name: userInfo?.real_name,
          timestamp: new Date(parseFloat(item.message.ts) * 1000).toISOString(),
          thread_replies_count: item.message.reply_count || 0,
          permalink: messagePermalink,
          mentions,
          thread_replies: threadReplies,
        };
      });

      // Log summary of formatted messages to verify DM attribution
      const dmMessagesForLogging = formattedMessages.filter((msg) =>
        msg.channel.startsWith('DM with')
      );
      const uniqueDMChannels = new Set(dmMessagesForLogging.map((msg) => msg.channel));
      logger.info(
        `[Slack Service] Formatted ${
          dmMessagesForLogging.length
        } messages from DMs with attributions: ${Array.from(uniqueDMChannels).join(', ')}`
      );

      // Log a sample of DM messages to verify they're in the response
      if (dmMessagesForLogging.length > 0) {
        const sampleDMs = dmMessagesForLogging.slice(0, 3);
        logger.info(
          `[Slack Service] Sample DM messages in response: ${JSON.stringify(
            sampleDMs.map((msg) => ({
              channel: msg.channel,
              channel_id: msg.channel_id,
              text_preview: msg.text.substring(0, 50) + '...',
            }))
          )}`
        );
      }

      // channels_searched represents the number of channels we fetched individually
      // Mentions are searched across all channels via search.messages API (not counted here)
      const channelsSearched = filteredChannels.length;

      // Separate messages into user mentions, regular channel messages, and DMs
      // A message is considered a "user mention" if the authenticated user is mentioned in:
      // 1. The main message's mentions array, OR
      // 2. Any thread reply's mentions array
      const userMentionMessages: ChannelDigestResponse['userMentionMessages'] = [];
      const channelMessages: ChannelDigestResponse['channelMessages'] = [];
      const dmMessages: ChannelDigestResponse['dmMessages'] = [];

      for (const message of formattedMessages) {
        // Check if this is a DM (channel name starts with "DM with")
        const isDM = message.channel.startsWith('DM with');

        // Check if authenticated user is mentioned in the main message
        const isMentionedInMainMessage = authenticatedUserId
          ? message.mentions.some((mention) => mention.user_id === authenticatedUserId)
          : false;

        // Check if authenticated user is mentioned in any thread reply
        const isMentionedInThread = authenticatedUserId
          ? message.thread_replies.some((reply) =>
              reply.mentions.some((mention) => mention.user_id === authenticatedUserId)
            )
          : false;

        const isUserMentioned = isMentionedInMainMessage || isMentionedInThread;

        if (isDM) {
          dmMessages.push(message as ChannelDigestResponse['dmMessages'][0]);
        } else if (isUserMentioned) {
          userMentionMessages.push(message as ChannelDigestResponse['userMentionMessages'][0]);
        } else {
          channelMessages.push(message as ChannelDigestResponse['channelMessages'][0]);
        }
      }

      logger.info(
        `[Slack Service] Separated messages: ${userMentionMessages.length} user mentions, ${channelMessages.length} regular channel messages, ${dmMessages.length} DMs`
      );

      const digestResponse: ChannelDigestResponse = {
        ok: true,
        total: formattedMessages.length,
        since: new Date(since * 1000).toISOString(),
        keywords: keywords || [],
        channels_searched: channelsSearched,
        userMentionMessages,
        channelMessages,
        dmMessages,
      };

      logger.info(
        `[Slack Service] getChannelDigest complete: ${digestResponse.total} messages from ${digestResponse.channels_searched} channels ` +
          `+ ${searchResultMatches.length} mentions from all channels (via search.messages API)`
      );
      logger.info(
        `==> [Slack Service] Breakdown: ${userMentionMessages.length} mention messages, ${channelMessages.length} channel messages, ${dmMessages.length} DM messages`
      );
      if (hasAllowedChannels) {
        logger.warn(
          `==> [Slack Service] ⚠️ NOTE: Regular channel messages are only from ${digestResponse.channels_searched} allowed channels. Mentions are from ALL channels. Consider removing allowedChannels config to fetch from all channels.`
        );
      }

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
    getConversationsMembers,
    getUsersList,
    getUserInfo,
    searchMessages,
    getChannelDigest,
  };
};
