/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentBuilderErrorCode,
  AgentExecutionMode,
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ExecutionStatus,
  type ChatEvent,
  type SerializedExecutionError,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { ChatCallbackFailurePayload } from '../../../common/http_api/chat_callback';
import { buildChatResponseFromEvents } from './utils/chat_response';
import { CallbackDeliveryService } from './callback_delivery_service';

const callbackUrl = 'https://relay.example.com/events?token=abc';
const createConversationExecution = (url: string | null = callbackUrl): AgentExecution =>
  ({
    executionId: 'execution-1',
    executionMode: AgentExecutionMode.conversation,
    agentParams: {
      nextInput: { message: 'hello' },
      ...(url ? { callback: { url } } : {}),
    },
  } as unknown as AgentExecution);
const createStandaloneExecution = (): AgentExecution =>
  ({
    executionId: 'execution-1',
    executionMode: AgentExecutionMode.standalone,
    agentParams: {
      nextInput: { message: 'hello' },
    },
  } as unknown as AgentExecution);
const responseTimeout = 60000;
const createCallbackDeliveryService = (ensureUriAllowed = jest.fn()) =>
  new CallbackDeliveryService({
    actions: {
      getActionsConfigurationUtilities: jest.fn().mockReturnValue({
        ensureUriAllowed,
        getResponseSettings: jest.fn().mockReturnValue({
          maxContentLength: 1048576,
          timeout: responseTimeout,
        }),
      }),
    },
  } as never);

describe('validateCallbackUrl', () => {
  it('delegates callback URL validation to the Actions allowed-host validator', () => {
    const ensureUriAllowed = jest.fn();
    const callbackDeliveryService = createCallbackDeliveryService(ensureUriAllowed);

    callbackDeliveryService.validateCallbackUrl(callbackUrl);

    expect(ensureUriAllowed).toHaveBeenCalledWith(callbackUrl);
  });

  it.each(['', '   '])(
    'throws without delegating to the allowed-host validator for a blank callback URL (%p)',
    (blankUrl) => {
      const ensureUriAllowed = jest.fn();
      const callbackDeliveryService = createCallbackDeliveryService(ensureUriAllowed);

      expect(() => callbackDeliveryService.validateCallbackUrl(blankUrl)).toThrow(
        'Callback URL must be a non-empty string'
      );

      expect(ensureUriAllowed).not.toHaveBeenCalled();
    }
  );
});

describe('callback request delivery', () => {
  const payload: ChatCallbackFailurePayload = {
    execution_id: 'execution-1',
    status: ExecutionStatus.failed,
    error: {
      code: AgentBuilderErrorCode.internalError,
      message: 'boom',
    },
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('posts the exact serialized JSON body without a signature', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
    const ensureUriAllowed = jest.fn();
    const callbackDeliveryService = createCallbackDeliveryService(ensureUriAllowed);

    await callbackDeliveryService.makeFailureCallbackRequestIfConfigured({
      execution: createConversationExecution(),
      payload,
    });

    const body = JSON.stringify(payload);
    expect(ensureUriAllowed).toHaveBeenCalledWith(callbackUrl);
    expect(fetchMock).toHaveBeenCalledWith(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('aborts and retries requests that exceed the Actions response timeout', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const { signal } = options as RequestInit;
          signal?.addEventListener('abort', () => reject(new Error('The operation was aborted')));
        })
    );

    const delivery = createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
      execution: createConversationExecution(),
      payload,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow('The operation was aborted');

    await jest.advanceTimersByTimeAsync(responseTimeout * 4);

    await deliveryExpectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not post when the callback URL is not allowlisted', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const ensureUriAllowed = jest.fn();
    const callbackDeliveryService = createCallbackDeliveryService(ensureUriAllowed);
    ensureUriAllowed.mockImplementation(() => {
      throw new Error(
        'target url "https://relay.example.com/events?token=abc" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });

    await expect(
      callbackDeliveryService.makeFailureCallbackRequestIfConfigured({
        execution: createConversationExecution(),
        payload,
      })
    ).rejects.toThrow(
      'target url "https://relay.example.com/events?token=abc" is not added to the Kibana config xpack.actions.allowedHosts'
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries network errors and 5xx responses', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 503 } as Response)
      .mockResolvedValueOnce({ status: 204 } as Response);

    const delivery = createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
      execution: createConversationExecution(),
      payload,
    });
    const deliveryExpectation = expect(delivery).resolves.toBeUndefined();

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry 4xx responses', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 400 } as Response);

    await expect(
      createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
        execution: createConversationExecution(),
        payload,
      })
    ).rejects.toThrow('Callback delivery failed with status 400');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retryable 5xx responses', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 503 } as Response);

    const delivery = createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
      execution: createConversationExecution(),
      payload,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow(
      'Callback delivery failed with status 503'
    );

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

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

    await createCallbackDeliveryService().makeSuccessCallbackRequestIfConfigured({
      execution: createConversationExecution(null),
      events,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not deliver for standalone executions', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await createCallbackDeliveryService().makeSuccessCallbackRequestIfConfigured({
      execution: createStandaloneExecution(),
      events,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('delivers the completed response payload when configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await createCallbackDeliveryService().makeSuccessCallbackRequestIfConfigured({
      execution: createConversationExecution(),
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

    await createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
      execution: createConversationExecution(null),
      payload: {
        execution_id: 'execution-1',
        error,
        status: ExecutionStatus.failed,
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not deliver for standalone executions', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
      execution: createStandaloneExecution(),
      payload: {
        execution_id: 'execution-1',
        error,
        status: ExecutionStatus.failed,
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('delivers the failed response payload', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
    const payload: ChatCallbackFailurePayload = {
      execution_id: 'execution-1',
      error,
      status: ExecutionStatus.aborted,
    };

    await createCallbackDeliveryService().makeFailureCallbackRequestIfConfigured({
      execution: createConversationExecution(),
      payload,
    });

    const body = fetchMock.mock.calls[0][1]?.body as string;
    expect(JSON.parse(body)).toEqual({
      execution_id: 'execution-1',
      error,
      status: ExecutionStatus.aborted,
    });
  });
});
