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
          messages: outboundMessages,
        };

  const requestBody = {
    params: {
      subActionParams: {
        body: JSON.stringify(body),
      },
      subAction: 'test',
    },
  };

  try {
    const path = assistantLangChain
      ? `/internal/elastic_assistant/actions/connector/${apiConfig?.connectorId}/_execute`
      : `/api/actions/connector/${apiConfig?.connectorId}/_execute`;

    // TODO: Find return type for this API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await http.fetch<any>(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    const data = response.data;
    if (response.status !== 'ok') {
      return API_ERROR;
    }

    if (data.choices && data.choices.length > 0 && data.choices[0].message.content) {
      const result = data.choices[0].message.content.trim();
      return result;
    } else {
      return API_ERROR;
    }
  } catch (error) {
    return API_ERROR;
  }
};
