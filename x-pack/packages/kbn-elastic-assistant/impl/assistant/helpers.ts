/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, some } from 'lodash';
import { AIConnector } from '../connectorland/connector_selector';
import { FetchConnectorExecuteResponse, FetchConversationsResponse } from './api';
import { Conversation } from '../..';
import type { ClientMessage } from '../assistant_context/types';
import { enterpriseMessaging, WELCOME_CONVERSATION } from './use_conversation/sample_conversations';

export const getMessageFromRawResponse = (
  rawResponse: FetchConnectorExecuteResponse
): ClientMessage => {
  const { response, isStream, isError } = rawResponse;
  const dateTimeString = new Date().toLocaleString(); // TODO: Pull from response
  if (rawResponse) {
    return {
      role: 'assistant',
      ...(isStream
        ? { reader: response as ReadableStreamDefaultReader<Uint8Array> }
        : { content: response as string }),
      timestamp: dateTimeString,
      isError,
      traceData: rawResponse.traceData,
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

export const getBlockBotConversation = (
  conversation: Conversation,
  isAssistantEnabled: boolean,
  isFlyoutMode: boolean
): Conversation => {
  if (!isAssistantEnabled) {
    if (
      conversation.messages.length === 0 ||
      conversation.messages[conversation.messages.length - 1].content !==
        enterpriseMessaging[0].content
    ) {
      return {
        ...conversation,
        messages: [...conversation.messages, ...enterpriseMessaging],
      };
    }
    return conversation;
  }

  return {
    ...conversation,
    messages: [...conversation.messages, ...(!isFlyoutMode ? WELCOME_CONVERSATION.messages : [])],
  };
};

/**
 * Returns a default connector if there is only one connector
 * @param connectors
 */
export const getDefaultConnector = (
  connectors: AIConnector[] | undefined
): AIConnector | undefined => {
  const validConnectors = connectors?.filter((connector) => !connector.isMissingSecrets);
  if (validConnectors?.length) {
    return validConnectors[0];
  }

  return undefined;
};

interface OptionalRequestParams {
  alertsIndexPattern?: string;
  allow?: string[];
  allowReplacement?: string[];
  size?: number;
}

export const getOptionalRequestParams = ({
  isEnabledRAGAlerts,
  alertsIndexPattern,
  allow,
  allowReplacement,
  size,
}: {
  isEnabledRAGAlerts: boolean;
  alertsIndexPattern?: string;
  allow?: string[];
  allowReplacement?: string[];
  size?: number;
}): OptionalRequestParams => {
  const optionalAlertsIndexPattern = alertsIndexPattern ? { alertsIndexPattern } : undefined;
  const optionalAllow = allow ? { allow } : undefined;
  const optionalAllowReplacement = allowReplacement ? { allowReplacement } : undefined;
  const optionalSize = size ? { size } : undefined;

  // the settings toggle must be enabled:
  if (!isEnabledRAGAlerts) {
    return {}; // don't send any optional params
  }

  return {
    ...optionalAlertsIndexPattern,
    ...optionalAllow,
    ...optionalAllowReplacement,
    ...optionalSize,
  };
};

export const hasParsableResponse = ({
  isEnabledRAGAlerts,
  isEnabledKnowledgeBase,
}: {
  isEnabledRAGAlerts: boolean;
  isEnabledKnowledgeBase: boolean;
}): boolean => isEnabledKnowledgeBase || isEnabledRAGAlerts;
