/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassicActionType as ConnectorType } from '@kbn/actions-plugin/server/types';
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
}
