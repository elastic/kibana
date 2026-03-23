/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, IToasts } from '@kbn/core/public';
import type {
  ApiConfig,
  Replacements,
  ScreenContext,
  MessageMetadata,
} from '@kbn/elastic-assistant-common';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';
import { API_ERROR } from '../translations';
import { getOptionalRequestParams } from '../helpers';
import type { TraceOptions } from '../types';
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
  toasts?: IToasts;
  screenContext: ScreenContext;
}

export interface FetchConnectorExecuteResponse {
  response: string | ReadableStreamDefaultReader<Uint8Array>;
  isError: boolean;
  isStream: boolean;
  traceData?: {
    transactionId: string;
    traceId: string;
  };
  metadata?: MessageMetadata;
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
  toasts,
  traceOptions,
  screenContext,
}: FetchConnectorExecuteAction): Promise<FetchConnectorExecuteResponse> => {
  const isStream = assistantStreamingEnabled;

  const optionalRequestParams = getOptionalRequestParams({
    alertsIndexPattern,
    size,
  });

  const requestBody = {
    message,
    subAction: isStream ? 'invokeStream' : 'invokeAI',
    conversationId,
    actionTypeId: apiConfig.actionTypeId,
    replacements,
    langSmithProject:
      traceOptions?.langSmithProject === '' ? undefined : traceOptions?.langSmithProject,
    langSmithApiKey:
      traceOptions?.langSmithApiKey === '' ? undefined : traceOptions?.langSmithApiKey,
    screenContext,
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
      metadata?: MessageMetadata;
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
      metadata: response.metadata,
      isError: false,
      isStream: false,
      traceData,
    };
  } catch (error) {
    const getReader = error?.response?.body?.getReader;
    const reader =
      isStream && typeof getReader === 'function' ? getReader.call(error.response.body) : null;
    const defaultErrorMessage = i18n.translate('xpack.elasticAssistant.messageError.title', {
      defaultMessage: 'An error occurred while sending the message',
    });

    if (error?.response.status === 403 && reader) {
      // For streaming errors, we need to read the stream to get the actual error message
      let errorMessage = error?.body?.message ?? error?.message;
      if (reader) {
        try {
          const { value } = await reader.read();
          if (value) {
            const errorText = new TextDecoder().decode(value);
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.body || errorMessage;
          }
        } catch (streamError) {
          errorMessage = defaultErrorMessage;
        }
      }
      // if streaming and error is 403, show toast
      const errorForToast = new Error(errorMessage);
      errorForToast.name = error?.name || 'Error';
      toasts?.addError(errorForToast, {
        title: defaultErrorMessage,
      });
    }
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
