/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { API_VERSIONS, ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import { API_ERROR } from '../translations';
import { getOptionalRequestParams } from '../helpers';
import { TraceOptions } from '../types';
export * from './conversations';
export * from './prompts';

export interface FetchConnectorExecuteAction {
  conversationId: string;
  alertsIndexPattern?: string;
  assistantStreamingEnabled: boolean;
  apiConfig: ApiConfig;
  http: HttpSetup;
  message?: string;
  replacements: Replacements;
  signal?: AbortSignal | undefined;
  size?: number;
  traceOptions?: TraceOptions;
}

export interface FetchConnectorExecuteResponse {
  response: string | ReadableStreamDefaultReader<Uint8Array>;
  isError: boolean;
  isStream: boolean;
  traceData?: {
    transactionId: string;
    traceId: string;
  };
}

export const fetchConnectorExecuteAction = async ({
  conversationId,
  alertsIndexPattern,
  assistantStreamingEnabled,
  http,
  message,
  replacements,
  apiConfig,
  signal,
  size,
  traceOptions,
}: FetchConnectorExecuteAction): Promise<FetchConnectorExecuteResponse> => {
  // TODO add streaming support for gemini with langchain on
  const isStream = assistantStreamingEnabled;

  const optionalRequestParams = getOptionalRequestParams({
    alertsIndexPattern,
    size,
  });

  const requestBody = {
    model: apiConfig?.model,
    message,
    subAction: isStream ? 'invokeStream' : 'invokeAI',
    conversationId,
    actionTypeId: apiConfig.actionTypeId,
    replacements,
    langSmithProject:
      traceOptions?.langSmithProject === '' ? undefined : traceOptions?.langSmithProject,
    langSmithApiKey:
      traceOptions?.langSmithApiKey === '' ? undefined : traceOptions?.langSmithApiKey,
    ...optionalRequestParams,
  };

  try {
    if (isStream) {
      const response = await http.fetch(
        `/internal/elastic_assistant/actions/connector/${apiConfig?.connectorId}/_execute`,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          signal,
          asResponse: true,
          rawResponse: true,
          version: API_VERSIONS.internal.v1,
        }
      );

      const reader = response?.response?.body?.getReader();

      if (!reader) {
        return {
          response: `${API_ERROR}\n\nCould not get reader from response`,
          isError: true,
          isStream: false,
        };
      }
      return {
        response: reader,
        isStream: true,
        isError: false,
      };
    }

    const response = await http.fetch<{
      connector_id: string;
      status: string;
      data: string;
      replacements?: Replacements;
      service_message?: string;
      trace_data?: {
        transaction_id: string;
        trace_id: string;
      };
    }>(`/internal/elastic_assistant/actions/connector/${apiConfig?.connectorId}/_execute`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
      signal,
      version: API_VERSIONS.internal.v1,
    });

    if (response.status !== 'ok' || !response.data) {
      if (response.service_message) {
        return {
          response: `${API_ERROR}\n\n${response.service_message}`,
          isError: true,
          isStream: false,
        };
      }
      return {
        response: API_ERROR,
        isError: true,
        isStream: false,
      };
    }

    // Only add traceData if it exists in the response
    const traceData =
      response.trace_data?.trace_id != null && response.trace_data?.transaction_id != null
        ? {
            traceId: response.trace_data?.trace_id,
            transactionId: response.trace_data?.transaction_id,
          }
        : undefined;

    return {
      response: response.data,
      isError: false,
      isStream: false,
      traceData,
    };
  } catch (error) {
    const getReader = error?.response?.body?.getReader;
    const reader =
      isStream && typeof getReader === 'function' ? getReader.call(error.response.body) : null;

    if (!reader) {
      return {
        response: `${API_ERROR}\n\n${error?.body?.message ?? error?.message}`,
        isError: true,
        isStream: false,
      };
    }
    return {
      response: reader,
      isStream: true,
      isError: true,
    };
  }
};
