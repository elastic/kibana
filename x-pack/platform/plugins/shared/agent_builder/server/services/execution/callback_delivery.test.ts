/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';
import {
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ExecutionStatus,
} from '@kbn/agent-builder-common';
import type { ChatCallbackSuccessPayload } from '../../../common/http_api/chat_callback';
import { deliverCallback } from './callback_delivery';

describe('deliverCallback', () => {
  const payload: ChatCallbackSuccessPayload = {
    execution_id: 'execution-1',
    status: ExecutionStatus.completed,
    response: {
      conversation_id: 'conversation-1',
      access_control: { access_mode: ConversationAccessControlMode.Public },
      round_id: 'round-1',
      status: ConversationRoundStatus.completed,
      steps: [],
      started_at: '2026-01-01T00:00:00.000Z',
      time_to_first_token: 1,
      time_to_last_token: 2,
      model_usage: {
        connector_id: 'connector-1',
        llm_calls: 1,
        input_tokens: 1,
        output_tokens: 1,
      },
      response: { message: 'hello' },
    },
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('posts the exact serialized JSON body with an HMAC signature', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await deliverCallback({
      url: 'https://relay.example.com/events?token=abc',
      secret: 'secret-1',
      payload,
    });

    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', 'secret-1').update(body).digest('hex');
    expect(fetchMock).toHaveBeenCalledWith('https://relay.example.com/events?token=abc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': `hmac-sha256=${signature}`,
      },
      body,
    });
  });

  it('retries network errors and 5xx responses', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 503 } as Response)
      .mockResolvedValueOnce({ status: 204 } as Response);

    const delivery = deliverCallback({
      url: 'https://relay.example.com/events?token=abc',
      secret: 'secret-1',
      payload,
    });
    const deliveryExpectation = expect(delivery).resolves.toBeUndefined();

    await jest.advanceTimersByTimeAsync(350);

    await deliveryExpectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry 4xx responses', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 400 } as Response);

    await expect(
      deliverCallback({
        url: 'https://relay.example.com/events?token=abc',
        secret: 'secret-1',
        payload,
      })
    ).rejects.toThrow('Callback delivery failed with status 400');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retryable 5xx responses', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 503 } as Response);

    const delivery = deliverCallback({
      url: 'https://relay.example.com/events?token=abc',
      secret: 'secret-1',
      payload,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow(
      'Callback delivery failed with status 503'
    );

    await jest.advanceTimersByTimeAsync(350);

    await deliveryExpectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
