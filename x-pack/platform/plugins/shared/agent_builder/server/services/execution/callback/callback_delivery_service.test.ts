/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentBuilderErrorCode, AgentExecutionMode } from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { ChatCallbackFailureResponse } from '../../../../common/http_api/chat_callback';
import { CallbackDeliveryService } from './callback_delivery_service';

const callbackUrl = 'https://callback.example.com/v1/events?token=abc';
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

const failurePayload: ChatCallbackFailureResponse = {
  execution_id: 'execution-1',
  error: {
    code: AgentBuilderErrorCode.internalError,
    message: 'boom',
  },
  idempotency_key: 'execution-1',
};

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

describe('getCallbackUrl', () => {
  it('returns the callback URL for conversation executions with a callback', () => {
    expect(createCallbackDeliveryService().getCallbackUrl(createConversationExecution())).toBe(
      callbackUrl
    );
  });

  it('returns undefined for conversation executions without a callback', () => {
    expect(
      createCallbackDeliveryService().getCallbackUrl(createConversationExecution(null))
    ).toBeUndefined();
  });

  it('returns undefined for standalone executions', () => {
    expect(
      createCallbackDeliveryService().getCallbackUrl(createStandaloneExecution())
    ).toBeUndefined();
  });
});

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

describe('createTransport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the exact serialized JSON body through fetch without a signature', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
    const transport = createCallbackDeliveryService().createTransport(callbackUrl);

    const abortController = new AbortController();
    await transport(failurePayload, abortController.signal);

    expect(fetchMock).toHaveBeenCalledWith(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(failurePayload),
      redirect: 'error',
      signal: abortController.signal,
    });
  });
});

describe('makeCallbackRequest', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('posts the payload once when the request succeeds', async () => {
    const transport = jest.fn().mockResolvedValue({ status: 200 });

    await createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      transport,
      retry: true,
    });

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith(failurePayload, expect.any(AbortSignal));
  });

  it('aborts and retries requests that exceed the Actions response timeout', async () => {
    jest.useFakeTimers();
    const transport = jest.fn().mockImplementation(
      (_payload, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('The operation was aborted')));
        })
    );

    const delivery = createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      transport,
      retry: true,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow('The operation was aborted');

    await jest.advanceTimersByTimeAsync(responseTimeout * 4);

    await deliveryExpectation;
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('retries network errors and 5xx responses when retry is true', async () => {
    jest.useFakeTimers();
    const transport = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 204 });

    const delivery = createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      transport,
      retry: true,
    });
    const deliveryExpectation = expect(delivery).resolves.toBeUndefined();

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('does not retry when retry is false', async () => {
    const transport = jest.fn().mockResolvedValue({ status: 503 });

    await expect(
      createCallbackDeliveryService().makeCallbackRequest({
        payload: failurePayload,
        transport,
        retry: false,
      })
    ).rejects.toThrow('Callback delivery failed with status 503');

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('does not retry 4xx responses', async () => {
    const transport = jest.fn().mockResolvedValue({ status: 400 });

    await expect(
      createCallbackDeliveryService().makeCallbackRequest({
        payload: failurePayload,
        transport,
        retry: true,
      })
    ).rejects.toThrow('Callback delivery failed with status 400');

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retryable 5xx responses', async () => {
    jest.useFakeTimers();
    const transport = jest.fn().mockResolvedValue({ status: 503 });

    const delivery = createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      transport,
      retry: true,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow(
      'Callback delivery failed with status 503'
    );

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(transport).toHaveBeenCalledTimes(3);
  });
});
