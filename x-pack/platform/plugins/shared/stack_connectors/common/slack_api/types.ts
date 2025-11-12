/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType as ConnectorType } from '@kbn/actions-plugin/server/types';
import type { ActionTypeExecutorOptions as ConnectorTypeExecutorOptions } from '@kbn/actions-plugin/server/types';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type {
  PostBlockkitSubActionParams,
  PostMessageSubActionParams,
  SlackApiConfig,
  SlackApiParams,
  SlackApiSecrets,
} from '@kbn/connector-schemas/slack_api';

export type SlackApiConnectorType = ConnectorType<
  SlackApiConfig,
  SlackApiSecrets,
  SlackApiParams,
  unknown
>;

export type SlackApiExecutorOptions = ConnectorTypeExecutorOptions<
  SlackApiConfig,
  SlackApiSecrets,
  SlackApiParams
>;

export type SlackExecutorOptions = ConnectorTypeExecutorOptions<
  SlackApiConfig,
  SlackApiSecrets,
  SlackApiParams
>;

export interface SlackAPiResponse {
  ok: boolean;
  error?: string;
  message?: {
    text: string;
  };
  response_metadata?: {
    next_cursor: string;
  };
}

export interface ChannelResponse {
  id: string;
  name: string;
  is_channel: boolean;
  is_archived: boolean;
  is_private: boolean;
}

export interface ValidChannelResponse extends SlackAPiResponse {
  channel?: ChannelResponse;
}

export interface PostMessageResponse extends SlackAPiResponse {
  channel?: string;
}

export interface ValidChannelRouteResponse {
  validChannels: Array<{ id: string; name: string }>;
  invalidChannels: string[];
}

export interface SlackMessage {
  text: string;
  user: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
}

export interface SlackConversation {
  id: string;
  name: string;
  is_private: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
}

export interface ConversationsListResponse extends SlackAPiResponse {
  channels?: SlackConversation[];
}

export interface ConversationsHistoryResponse extends SlackAPiResponse {
  messages?: SlackMessage[];
  has_more?: boolean;
}

export interface ConversationsRepliesResponse extends SlackAPiResponse {
  messages?: SlackMessage[];
}

export interface ConversationsMembersResponse extends SlackAPiResponse {
  members?: string[];
  response_metadata?: {
    next_cursor?: string;
  };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    display_name?: string;
    real_name?: string;
  };
}

export interface UsersListResponse extends SlackAPiResponse {
  members?: SlackUser[];
}

export interface UserInfoResponse extends SlackAPiResponse {
  user?: SlackUser;
}

export interface SearchMessagesMatch {
  type: string;
  channel?: {
    id: string;
    name: string;
    is_channel: boolean;
    is_private: boolean;
  };
  user?: string;
  username?: string;
  ts: string;
  text: string;
  permalink?: string;
}

export interface SearchMessagesResponse extends SlackAPiResponse {
  query?: string;
  messages?: {
    total: number;
    pagination?: {
      total_count: number;
      page: number;
      per_page: number;
      page_count: number;
    };
    paging?: {
      count: number;
      total: number;
      page: number;
      pages: number;
    };
    matches?: SearchMessagesMatch[];
  };
}

export interface ChannelDigestMessage {
  channel: { id: string; name: string };
  message: SlackMessage;
  thread_replies?: Array<{ user: string; text: string; ts: string }>;
}

export interface SlackMessage {
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
}

export interface ChannelDigestResponse extends SlackAPiResponse {
  total: number;
  since: string;
  keywords?: string[];
  channels_searched: number;
  // Messages where the authenticated user is mentioned (mentions array contains authenticated user's ID)
  userMentionMessages: SlackMessage[];
  // Regular channel messages (no mention of authenticated user, or empty mentions array)
  channelMessages: SlackMessage[];
  // Direct messages (DMs) - only included when types includes 'im' or 'mpim'
  dmMessages: SlackMessage[];
}

export interface SlackApiService {
  validChannelId: (
    channelId: string
  ) => Promise<ConnectorTypeExecutorResult<ValidChannelResponse | void>>;
  postMessage: ({
    channels,
    channelIds,
    channelNames,
    text,
  }: PostMessageSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
  postBlockkit: ({
    channels,
    channelIds,
    channelNames,
    text,
  }: PostBlockkitSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
  getConversationsList: (params: {
    types?: string;
    cursor?: string;
    excludeArchived?: boolean;
    limit?: number;
  }) => Promise<ConnectorTypeExecutorResult<ConversationsListResponse>>;
  getConversationsHistory: (params: {
    channel: string;
    oldest?: number;
    cursor?: string;
    limit?: number;
  }) => Promise<ConnectorTypeExecutorResult<ConversationsHistoryResponse>>;
  getConversationsReplies: (params: {
    channel: string;
    ts: string;
  }) => Promise<ConnectorTypeExecutorResult<ConversationsRepliesResponse>>;
  getConversationsMembers: (params: {
    channel: string;
    cursor?: string;
    limit?: number;
  }) => Promise<ConnectorTypeExecutorResult<ConversationsMembersResponse>>;
  getUsersList: (params: {
    cursor?: string;
    limit?: number;
  }) => Promise<ConnectorTypeExecutorResult<UsersListResponse>>;
  getUserInfo: (params: { user: string }) => Promise<ConnectorTypeExecutorResult<UserInfoResponse>>;
  searchMessages: (params: {
    query: string;
    count?: number;
    page?: number;
  }) => Promise<ConnectorTypeExecutorResult<SearchMessagesResponse>>;
  getChannelDigest: (params: {
    since: number;
    types: string[];
    keywords?: string[];
    searchAllChannels?: boolean;
  }) => Promise<ConnectorTypeExecutorResult<ChannelDigestResponse>>;
}
