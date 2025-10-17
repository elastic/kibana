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
    config?: { allowedChannels?: Array<{ id?: string; name: string }> };

    secrets: { token: string };
  },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector
): SlackApiService => {
  const { token } = secrets;
  const { allowedChannels } = config || { allowedChannels: [] };
  const allowedChannelIds = allowedChannels?.map((ac) => ac.id);
  const allowedChannelNames = allowedChannels?.map((ac) => ac.name);

  if (!token) {
    throw Error(`[Action][${SLACK_CONNECTOR_NAME}]: Wrong configuration.`);
  }

  const axiosInstance = axios.create();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-type': 'application/json; charset=UTF-8',
  };

  const validateChannelNames = (channelNames?: string[]): void => {
    if (!channelNames || channelNames.length === 0) {
      return;
    }

    // validate against allowed channel list
    if (allowedChannelNames && allowedChannelNames.length > 0) {
      const notAllowedChannelNames = channelNames.filter(
        (channel) => !allowedChannelNames.includes(channel)
      );

      if (notAllowedChannelNames.length > 0) {
        throw new Error(
          `One or more channel names ${notAllowedChannelNames.join(
            ', '
          )} are not included in the allowed channel list`
        );
      }
    }
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
    channelNames = [],
  }: {
    channels?: string[];
    channelIds?: string[];
    channelNames?: string[];
  }): string => {
    let channelToUse = '';

    const mappedChannelNames = channelNames.length ? channelNames : channels ?? [];

    if (mappedChannelNames.length > 0) {
      if (
        allowedChannelNames &&
        allowedChannelNames.length &&
        !mappedChannelNames.every((name) => allowedChannelNames?.includes(name))
      ) {
        throw new Error(
          `One or more provided channel names are not included in the allowed channels list`
        );
      }
      // For now, we only allow one channel but we wanted
      // to have a array in case we need to allow multiple channels
      // in one action
      channelToUse = mappedChannelNames[0];
    } else if (channelIds.length > 0) {
      if (
        allowedChannelIds &&
        allowedChannelIds.length > 0 &&
        !channelIds.every((cId) => allowedChannelIds?.includes(cId))
      ) {
        throw new Error(
          `One of channel ids "${channelIds.join()}" is not included in the allowed channels list "${allowedChannelIds?.join()}"`
        );
      }
      channelToUse = channelIds[0];
    } else {
      throw new Error(`The channel is empty`);
    }

    return channelToUse;
  };
  const postMessage = async ({
    channels,
    channelIds = [],
    channelNames = [],
    text,
  }: PostMessageSubActionParams & { channelNames?: string[] }): Promise<
    ConnectorTypeExecutorResult<unknown>
  > => {
    try {
      validateChannelNames(channelNames);
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
    channels,
    channelIds = [],
    channelNames = [],
    text,
  }: PostBlockkitSubActionParams & { channelNames?: string[] }): Promise<
    ConnectorTypeExecutorResult<unknown>
  > => {
    try {
      validateChannelNames(channelNames);
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
