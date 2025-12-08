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

  return {
    validChannelId,
    postMessage,
    postBlockkit,
  };
};
