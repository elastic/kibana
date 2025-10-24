/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType as ConnectorType } from '@kbn/actions-plugin/server/types';
import type { TypeOf } from '@kbn/config-schema';
import type { ActionTypeExecutorOptions as ConnectorTypeExecutorOptions } from '@kbn/actions-plugin/server/types';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type {
  PostMessageParamsSchema,
  PostMessageSubActionParamsSchema,
  PostBlockkitSubActionParamsSchema,
  PostBlockkitParamsSchema,
  SlackApiSecretsSchema,
  SlackApiParamsSchema,
  SlackApiConfigSchema,
  ValidChannelIdSubActionParamsSchema,
  SearchChannelsSubActionParamsSchema,
  SearchChannelsParamsSchema,
} from './schema';

export type SlackApiSecrets = TypeOf<typeof SlackApiSecretsSchema>;
export type SlackApiConfig = TypeOf<typeof SlackApiConfigSchema>;

export type PostMessageParams = TypeOf<typeof PostMessageParamsSchema>;
export type PostMessageSubActionParams = TypeOf<typeof PostMessageSubActionParamsSchema>;
export type PostBlockkitSubActionParams = TypeOf<typeof PostBlockkitSubActionParamsSchema>;
export type PostBlockkitParams = TypeOf<typeof PostBlockkitParamsSchema>;
export type ValidChannelIdSubActionParams = TypeOf<typeof ValidChannelIdSubActionParamsSchema>;
export type SearchChannelsSubActionParams = TypeOf<typeof SearchChannelsSubActionParamsSchema>;
export type SearchChannelsParams = TypeOf<typeof SearchChannelsParamsSchema>;
export type SlackApiParams = TypeOf<typeof SlackApiParamsSchema>;
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

export type SlackApiActionParams = TypeOf<typeof SlackApiParamsSchema>;

export interface SlackApiResponse {
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

export interface ValidChannelResponse extends SlackApiResponse {
  channel?: ChannelResponse;
}

export interface PostMessageResponse extends SlackApiResponse {
  channel?: string;
}

export interface SearchChannelsResponse extends SlackApiResponse {
  messages?: {
    matches: Array<{
      channel: { id: string; name: string };
      text: string;
      user: string;
      username: string;
      ts: string;
      permalink: string;
    }>;
    total: number;
  };
}

export interface ValidChannelRouteResponse {
  validChannels: Array<{ id: string; name: string }>;
  invalidChannels: string[];
}

export interface SlackApiService {
  validChannelId: (
    channelId: string
  ) => Promise<ConnectorTypeExecutorResult<ValidChannelResponse | void>>;
  postMessage: ({
    channels,
    channelIds,
    text,
  }: PostMessageSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
  postBlockkit: ({
    channels,
    channelIds,
    text,
  }: PostBlockkitSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
  searchChannels: ({
    query,
    count,
    page,
  }: SearchChannelsSubActionParams) => Promise<ConnectorTypeExecutorResult<unknown>>;
}
