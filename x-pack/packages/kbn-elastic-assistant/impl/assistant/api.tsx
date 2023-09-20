/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';

import { HttpSetup } from '@kbn/core-http-browser';
import type { Message } from '../assistant_context/types';
import { Conversation } from '../assistant_context/types';
import { API_ERROR } from './translations';
import { MODEL_GPT_3_5_TURBO } from '../connectorland/models/model_selector/model_selector';

export interface FetchConnectorExecuteAction {
  assistantLangChain: boolean;
  apiConfig: Conversation['apiConfig'];
  http: HttpSetup;
  messages: Message[];
  signal?: AbortSignal | undefined;
}

export const fetchConnectorExecuteAction = async ({
  assistantLangChain,
  http,
  messages,
  apiConfig,
  signal,
}: FetchConnectorExecuteAction): Promise<string> => {
  const outboundMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const body =
    apiConfig?.provider === OpenAiProviderType.OpenAi
      ? {
          model: apiConfig.model ?? MODEL_GPT_3_5_TURBO,
          messages: outboundMessages,
          n: 1,
          stop: null,
          temperature: 0.2,
        }
      : {
          // Azure OpenAI and Bedrock invokeAI both expect this body format
          messages: outboundMessages,
        };

  const requestBody = {
    params: {
      subActionParams: body,
      subAction: 'invokeAI',
    },
  };

  try {
    const path = assistantLangChain
      ? `/internal/elastic_assistant/actions/connector/${apiConfig?.connectorId}/_execute`
      : `/api/actions/connector/${apiConfig?.connectorId}/_execute`;

    const response = await http.fetch<{ connector_id: string; status: string; data: string }>(
      path,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      }
    );

    if (response.status !== 'ok') {
      return API_ERROR;
    }

    return response.data;
  } catch (error) {
    return API_ERROR;
  }
};
