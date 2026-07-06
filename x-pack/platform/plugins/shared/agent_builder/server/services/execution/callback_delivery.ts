/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import { ExecutionStatus, type ChatEvent } from '@kbn/agent-builder-common';
import type {
  CallbackPayload,
  ChatCallbackAbortedPayload,
  ChatCallbackFailurePayload,
} from '../../../common/http_api/chat_callback';
import { buildChatResponseFromEvents } from './utils/chat_response';

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
export const makeSuccessCallbackRequestIfConfigured = async ({
  executionId,
  events,
  callbackUrl,
}: {
  executionId: string;
  events: ChatEvent[];
  callbackUrl: string | undefined;
}): Promise<void> => {
  await makeCallbackRequestIfConfigured({
    callbackUrl,
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
export const makeFailureCallbackRequestIfConfigured = async ({
  callbackUrl,
  payload,
}: {
  callbackUrl: string | undefined;
  payload: ChatCallbackFailurePayload | ChatCallbackAbortedPayload;
}): Promise<void> => {
  await makeCallbackRequestIfConfigured({ callbackUrl, payload });
};

export const makeCallbackRequestIfConfigured = async ({
  callbackUrl,
  payload,
}: {
  callbackUrl: string | undefined;
  payload: CallbackPayload;
}): Promise<void> => {
  if (!callbackUrl) {
    return;
  }

  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
  };

  await pRetry(async () => {
    let response: Response;
    try {
      response = await fetch(callbackUrl, {
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
