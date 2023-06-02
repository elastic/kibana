/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';

import { HttpSetup } from '@kbn/core-http-browser';
import type { Message } from '../assistant_context/types';
import { Conversation } from '../assistant_context/types';
import { API_ERROR } from './translations';

export const fetchOpenAlerts = async () => []; // TODO: fetch alerts via alerts API

export interface FetchVirusTotalAnalysisProps {
  analysisId: string;
  apiKey: string;
  baseUrl: string;
}
export const fetchVirusTotalAnalysis = async ({
  analysisId,
  apiKey,
  baseUrl,
}: FetchVirusTotalAnalysisProps) => {
  try {
    const response = await axios.get(`${baseUrl}/analyses/${analysisId}`, {
      headers: {
        'x-apikey': apiKey,
      },
    });
    return response.data;
  } catch (error) {
    return null;
  }
};

export interface SendFileToVirusTotalProps {
  file: File;
  apiKey: string;
  baseUrl: string;
}
export const sendFileToVirusTotal = async ({
  file,
  apiKey,
  baseUrl,
}: SendFileToVirusTotalProps) => {
  const url = `${baseUrl}/files`;

  const formData = new FormData();
  formData.append('file', file); // Append the file to the FormData object

  const response = await axios.post(url, formData, {
    headers: {
      'x-apikey': apiKey,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export interface FetchConnectorExecuteAction {
  apiConfig: Conversation['apiConfig'];
  http: HttpSetup;
  messages: Message[];
  signal?: AbortSignal | undefined;
}

export const fetchConnectorExecuteAction = async ({
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
          model: 'gpt-3.5-turbo',
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
    // TODO: Find return type for this API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await http.fetch<any>(
      `/api/actions/connector/${apiConfig?.connectorId}/_execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      }
    );

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
