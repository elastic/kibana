/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery, HttpSetup } from '@kbn/core-http-browser';
import {
  API_VERSIONS,
  MessageMetadata,
  PromptIds,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { TraceOptions } from '../../types';
import { API_ERROR } from '../../translations';

export interface PostChatCompleteParams {
  actionTypeId: string;
  alertsIndexPattern?: string;
  connectorId: string;
  http: HttpSetup;
  message: string;
  promptIds?: PromptIds;
  replacements: Replacements;
  query?: HttpFetchQuery;
  signal?: AbortSignal | undefined;
  traceOptions?: TraceOptions;
}
export interface ChatCompleteResponse {
  response: string;
  isError: boolean;
  isStream: boolean;
  traceData?: {
    transactionId: string;
    traceId: string;
  };
  metadata?: MessageMetadata;
}
export const postChatComplete = async ({
  actionTypeId,
  alertsIndexPattern,
  connectorId,
  http,
  message,
  promptIds,
  replacements,
  query,
  signal,
  traceOptions,
}: PostChatCompleteParams): Promise<ChatCompleteResponse> => {
  try {
    const path = `/internal/elastic_assistant/actions/connector/${connectorId}/_execute`;
    const requestBody = {
      actionTypeId,
      alertsIndexPattern,
      langSmithProject:
        traceOptions?.langSmithProject === '' ? undefined : traceOptions?.langSmithProject,
      langSmithApiKey:
        traceOptions?.langSmithApiKey === '' ? undefined : traceOptions?.langSmithApiKey,
      message,
      promptIds,
      replacements,
      subAction: 'invokeAI',
    };
    const response = await http.fetch<{
      connector_id: string;
      data: string;
      metadata?: MessageMetadata;
      replacements?: Replacements;
      service_message?: string;
      status: string;
      trace_data?: {
        transaction_id: string;
        trace_id: string;
      };
    }>(path, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      signal,
      query,
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
    return {
      response: `${API_ERROR}\n\n${error?.body?.message ?? error?.message}`,
      isError: true,
      isStream: false,
    };
  }
};
