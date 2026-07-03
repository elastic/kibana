/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import {
  ExecutionStatus,
  type ChatEvent,
  type SerializedExecutionError,
} from '@kbn/agent-builder-common';
import type {
  ChatCallbackAbortedPayload,
  ChatCallbackFailurePayload,
  ChatCallbackSuccessPayload,
} from '../../../common/http_api/chat_callback';
import { buildChatResponseFromEvents } from './utils/chat_response';

type CallbackPayload =
  | ChatCallbackSuccessPayload
  | ChatCallbackFailurePayload
  | ChatCallbackAbortedPayload;

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 100,
  factor: 2.5,
  randomize: false,
} as const;

/**
 * Delivers a success callback for a completed execution when a callback URL is configured.
 * No-op otherwise.
 */
export const makeSuccessCallbackIfConfigured = async ({
  executionId,
  events,
  callbackUrl,
}: {
  executionId: string;
  events: ChatEvent[];
  callbackUrl: string | undefined;
}): Promise<void> => {
  if (!callbackUrl) {
    return;
  }

  await makeCallbackRequest({
    url: callbackUrl,
    payload: {
      execution_id: executionId,
      status: ExecutionStatus.completed,
      response: buildChatResponseFromEvents(events),
    },
  });
};

/**
 * Delivers a failure callback for a failed or aborted execution when a callback URL is
 * configured. No-op otherwise.
 */
export const makeFailureCallbackIfConfigured = async ({
  executionId,
  conversationId,
  error,
  status,
  callbackUrl,
}: {
  executionId: string;
  conversationId?: string;
  error: SerializedExecutionError;
  status: ExecutionStatus.failed | ExecutionStatus.aborted;
  callbackUrl: string | undefined;
}): Promise<void> => {
  if (!callbackUrl) {
    return;
  }

  await makeCallbackRequest({
    url: callbackUrl,
    payload: {
      execution_id: executionId,
      ...(conversationId ? { conversation_id: conversationId } : {}),
      status,
      error,
    },
  });
};

export const makeCallbackRequest = async ({
  url,
  payload,
}: {
  url: string;
  payload: CallbackPayload;
}): Promise<void> => {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
  };

  await pRetry(async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    if (response.status >= 200 && response.status < 300) {
      return;
    }

    const error = new Error(`Callback delivery failed with status ${response.status}`);
    if (response.status >= 500) {
      throw error;
    }

    throw new AbortError(error);
  }, callbackRetryOptions);
};
