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
import { SLACK_CONNECTOR_NAME } from './translations';
import type {
  PostMessageSubActionParams,
  PostBlockkitSubActionParams,
  SlackApiService,
  PostMessageResponse,
  SlackApiResponse,
  ValidChannelResponse,
  SearchChannelsSubActionParams,
  SearchChannelsResponse,
} from '../../../common/slack_api/types';
import {
  retryResultSeconds,
  retryResult,
  serviceErrorResult,
  searchErrorResult,
  errorResult,
  successResult,
} from '../../../common/slack_api/lib';
import { SLACK_API_CONNECTOR_ID, SLACK_URL } from '../../../common/slack_api/constants';
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
    return serviceErrorResult(SLACK_API_CONNECTOR_ID, slackApiError.message);
  }

  const { status, statusText, headers } = slackApiError.response;

  // special handling for 5xx
  if (status >= 500) {
    return retryResult(SLACK_API_CONNECTOR_ID, slackApiError.message);
  }

  // special handling for rate limiting
  if (status === 429) {
    return pipe(
      getRetryAfterIntervalFromHeaders(headers),
      map((retry) => retryResultSeconds(SLACK_API_CONNECTOR_ID, slackApiError.message, retry)),
      getOrElse(() => retryResult(SLACK_API_CONNECTOR_ID, slackApiError.message))
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
  logger.error(`error on ${SLACK_API_CONNECTOR_ID} slack action: ${errorMessage}`);

  const errorSource = getErrorSource(slackApiError as Error);

  return errorResult(SLACK_API_CONNECTOR_ID, errorMessage, errorSource);
};

const buildSlackExecutorSuccessResponse = <T extends SlackApiResponse>({
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
    return errorResult(SLACK_API_CONNECTOR_ID, errMessage);
  }

  if (!slackApiResponseData.ok) {
    return serviceErrorResult(SLACK_API_CONNECTOR_ID, slackApiResponseData.error);
  }
  return successResult<T>(SLACK_API_CONNECTOR_ID, slackApiResponseData);
};

export const createExternalService = (
  {
    config,
    secrets,
  }: {
    config?: { allowedChannels?: Array<{ id: string; name: string }> };
    secrets: { token: string; userToken?: string };
  },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector
): SlackApiService => {
  const { token, userToken } = secrets;
  const { allowedChannels } = config || { allowedChannels: [] };
  const allowedChannelIds = allowedChannels?.map((ac) => ac.id);

  if (!token) {
    throw Error(`[Action][${SLACK_CONNECTOR_NAME}]: Wrong configuration.`);
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

  const searchChannels = async ({
    query,
    count = 20,
    page = 1,
  }: SearchChannelsSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      // Check if userToken is configured
      if (!userToken) {
        const errorMessage =
          'User token is required for search operations. Please configure a user token (xoxp-...) in the connector settings.';
        logger.error(`searchChannels failed: ${errorMessage}`);
        return searchErrorResult(SLACK_API_CONNECTOR_ID, errorMessage);
      }

      if (query.length === 0) {
        const errorMessage = 'The search query is empty';
        logger.error(`searchChannels failed: ${errorMessage}`);
        return searchErrorResult(SLACK_API_CONNECTOR_ID, errorMessage);
      }

      // Build URL with query parameters
      const searchParams = new URLSearchParams({
        query,
        count: count.toString(),
        page: page.toString(),
      });

      const searchUrl = `${SLACK_URL}search.messages?${searchParams.toString()}`;
      logger.debug(`Slack API searchChannels: calling ${searchUrl} with query="${query}"`);

      // Use userToken for search (search.messages requires a user token, not bot token)
      const searchHeaders = {
        Authorization: `Bearer ${userToken}`,
        'Content-type': 'application/json; charset=UTF-8',
      };

      const result: AxiosResponse<SearchChannelsResponse> = await request({
        axios: axiosInstance,
        method: 'get',
        url: searchUrl,
        logger,
        headers: searchHeaders,
        configurationUtilities,
        connectorUsageCollector,
      });

      logger.debug(
        `Slack API searchChannels response: ok=${result.data.ok}, error=${result.data.error}`
      );

      // Check if Slack returned an error in the response body
      if (!result.data.ok && result.data.error) {
        const errorMessage = `Slack API error: ${result.data.error}`;
        logger.error(`searchChannels failed: ${errorMessage}`);
        return searchErrorResult(SLACK_API_CONNECTOR_ID, errorMessage);
      }

      return buildSlackExecutorSuccessResponse<SearchChannelsResponse>({
        slackApiResponseData: result.data,
      });
    } catch (error) {
      logger.error(`searchChannels exception: ${error.message}`);
      const errorMessage = error.message || 'Unknown error occurred';
      return searchErrorResult(SLACK_API_CONNECTOR_ID, errorMessage);
    }
  };

  return {
    validChannelId,
    postMessage,
    postBlockkit,
    searchChannels,
  };
};
