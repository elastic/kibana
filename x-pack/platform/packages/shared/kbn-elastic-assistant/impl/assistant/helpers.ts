/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, some } from 'lodash';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { AIConnector } from '../connectorland/connector_selector';
import type { FetchConnectorExecuteResponse, FetchConversationsResponse } from './api';
import type { ClientMessage } from '../assistant_context/types';
import { Conversation } from '../..';

export const getMessageFromRawResponse = (
  rawResponse: FetchConnectorExecuteResponse
): ClientMessage => {
  const { response, isStream, isError } = rawResponse;
  const dateTimeString = new Date().toISOString(); // TODO: Pull from response
  if (rawResponse) {
    return {
      role: 'assistant',
      ...(isStream
        ? { reader: response as ReadableStreamDefaultReader<Uint8Array> }
        : { content: response as string }),
      timestamp: dateTimeString,
      isError,
      traceData: rawResponse.traceData,
      metadata: rawResponse.metadata,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
      isError: true,
    };
  }
};

export const mergeBaseWithPersistedConversations = (
  baseConversations: Record<string, Conversation>,
  conversationsData: FetchConversationsResponse
): Record<string, Conversation> => {
  return [...(conversationsData?.data ?? []), ...Object.values(baseConversations)].reduce<
    Record<string, Conversation>
  >((transformed, conversation) => {
    if (!isEmpty(conversation.id)) {
      transformed[conversation.id] = conversation;
    } else {
      if (!some(Object.values(transformed), ['title', conversation.title])) {
        transformed[conversation.title] = conversation;
      }
    }
    return transformed;
  }, {});
};
/**
 * Returns a default connector if there is only one connector
 * @param connectors
 */
export const getDefaultConnector = (
  connectors: AIConnector[] | undefined,
  settings: SettingsStart
): AIConnector | undefined => {
  const defaultAiConnectorId = settings.client.get<string>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
    undefined
  );

  const validConnectors = connectors?.filter((connector) => !connector.isMissingSecrets);
  const defaultConnector = validConnectors?.find(
    (connector) => connector.id === defaultAiConnectorId
  );

  if (defaultConnector) {
    // If the user has set a default connector setting, and that connector exists, use it
    return defaultConnector;
  }

  if (validConnectors?.length) {
    // In case the default connector is not set or is invalid, return the first valid connector
    return validConnectors[0];
  }

  // If no valid connectors are available, return undefined
  return undefined;
};

interface OptionalRequestParams {
  alertsIndexPattern?: string;
  size?: number;
}

export const getOptionalRequestParams = ({
  alertsIndexPattern,
  size,
}: {
  alertsIndexPattern?: string;
  size?: number;
}): OptionalRequestParams => {
  const optionalAlertsIndexPattern = alertsIndexPattern ? { alertsIndexPattern } : undefined;
  const optionalSize = size ? { size } : undefined;

  return {
    ...optionalAlertsIndexPattern,
    ...optionalSize,
  };
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
