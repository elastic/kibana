/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentBuilderErrorCode,
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ExecutionStatus,
  type ChatEvent,
  type SerializedExecutionError,
} from '@kbn/agent-builder-common';
import type { ChatCallbackSuccessPayload } from '../../../common/http_api/chat_callback';
import { buildChatResponseFromEvents } from './utils/chat_response';
import {
  makeCallbackRequest,
  makeFailureCallbackRequestIfConfigured,
  makeSuccessCallbackRequestIfConfigured,
} from './callback_delivery';

describe('makeCallbackRequest', () => {
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

  it('posts the exact serialized JSON body without a signature', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await makeCallbackRequest({
      url: 'https://relay.example.com/events?token=abc',
      payload,
    });

    const body = JSON.stringify(payload);
    expect(fetchMock).toHaveBeenCalledWith('https://relay.example.com/events?token=abc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    const delivery = makeCallbackRequest({
      url: 'https://relay.example.com/events?token=abc',
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
      makeCallbackRequest({
        url: 'https://relay.example.com/events?token=abc',
        payload,
      })
    ).rejects.toThrow('Callback delivery failed with status 400');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retryable 5xx responses', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 503 } as Response);

    const delivery = makeCallbackRequest({
      url: 'https://relay.example.com/events?token=abc',
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

const callbackUrl = 'https://relay.example.com/events?token=abc';

describe('makeSuccessCallbackRequestIfConfigured', () => {
  const events: ChatEvent[] = [
    {
      type: ChatEventType.conversationUpdated,
      data: {
        conversation_id: 'conversation-1',
        title: 'Conversation',
        access_control: { access_mode: ConversationAccessControlMode.Public },
      },
    },
    {
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'round-1',
          status: ConversationRoundStatus.completed,
          input: { message: 'hello' },
          steps: [],
          response: { message: 'world' },
          started_at: '2026-01-01T00:00:00.000Z',
          time_to_first_token: 1,
          time_to_last_token: 2,
          model_usage: {
            connector_id: 'connector-1',
            llm_calls: 1,
            input_tokens: 1,
            output_tokens: 1,
          },
        },
      },
    },
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not deliver when no callback is configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await makeSuccessCallbackRequestIfConfigured({
      callbackUrl: undefined,
      executionId: 'execution-1',
      events,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('delivers the completed response payload when configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await makeSuccessCallbackRequestIfConfigured({
      callbackUrl,
      executionId: 'execution-1',
      events,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1]?.body as string;
    expect(JSON.parse(body)).toEqual({
      execution_id: 'execution-1',
      status: ExecutionStatus.completed,
      response: buildChatResponseFromEvents(events),
    });
  });
});

describe('makeFailureCallbackRequestIfConfigured', () => {
  const error: SerializedExecutionError = {
    code: AgentBuilderErrorCode.internalError,
    message: 'boom',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not deliver when no callback is configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await makeFailureCallbackRequestIfConfigured({
      callbackUrl: undefined,
      payload: {
        execution_id: 'execution-1',
        error,
        status: ExecutionStatus.failed,
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('includes conversation_id when provided', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await makeFailureCallbackRequestIfConfigured({
      callbackUrl,
      payload: {
        execution_id: 'execution-1',
        conversation_id: 'conversation-1',
        error,
        status: ExecutionStatus.failed,
      },
    });

    const body = fetchMock.mock.calls[0][1]?.body as string;
    expect(JSON.parse(body)).toEqual({
      execution_id: 'execution-1',
      conversation_id: 'conversation-1',
      status: ExecutionStatus.failed,
      error,
    });
  });

  it('omits conversation_id when not provided', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await makeFailureCallbackRequestIfConfigured({
      callbackUrl,
      payload: {
        execution_id: 'execution-1',
        status: ExecutionStatus.aborted,
      },
    });

    const body = fetchMock.mock.calls[0][1]?.body as string;
    expect(JSON.parse(body)).toEqual({
      execution_id: 'execution-1',
      status: ExecutionStatus.aborted,
    });
  });
});
