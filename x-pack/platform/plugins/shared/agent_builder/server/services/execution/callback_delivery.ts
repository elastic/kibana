/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';
import pRetry, { AbortError } from 'p-retry';
import type {
  ChatCallbackAbortedPayload,
  ChatCallbackFailurePayload,
  ChatCallbackSuccessPayload,
} from '../../../common/http_api/chat_callback';

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

export const deliverCallback = async ({
  url,
  secret,
  payload,
}: {
  url: string;
  secret: string;
  payload: CallbackPayload;
}): Promise<void> => {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  const headers = {
    'Content-Type': 'application/json',
    'X-Signature': `hmac-sha256=${signature}`,
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
