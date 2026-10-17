/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { AgentBuilderErrorCode, ConversationOriginType } from '@kbn/agent-builder-common';
import type { ChatCallbackFailureResponse } from '../../../../common/http_api/chat_callback';
import { CallbackDeliveryService } from './callback_delivery_service';

const callbackUrl = 'https://callback.example.com/v1/events?token=abc';

const failurePayload: ChatCallbackFailureResponse = {
  execution_id: 'execution-1',
  error: {
    code: AgentBuilderErrorCode.internalError,
    message: 'boom',
  },
  idempotency_key: 'execution-1',
};

const responseTimeout = 60000;
const createCallbackDeliveryService = (
  ensureUriAllowed = jest.fn(),
  relayClient?: {
    isRelayOrigin: jest.Mock;
    postCallback: jest.Mock;
  }
) =>
  new CallbackDeliveryService({
    actions: {
      getRelayClient: jest.fn().mockReturnValue(relayClient),
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

  it('posts through the Actions Relay client for matching callback URLs', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const relayClient = {
      isRelayOrigin: jest.fn().mockReturnValue(true),
      postCallback: jest.fn().mockResolvedValue({ status: 204 }),
    };
    const transport = createCallbackDeliveryService(jest.fn(), relayClient).createTransport(
      callbackUrl
    );

    const abortController = new AbortController();
    await transport(failurePayload, abortController.signal);

    expect(relayClient.isRelayOrigin).toHaveBeenCalledWith(callbackUrl);
    expect(relayClient.postCallback).toHaveBeenCalledWith(
      callbackUrl,
      failurePayload,
      abortController.signal
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts through fetch when the URL is not a Relay origin', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
    const relayClient = {
      isRelayOrigin: jest.fn().mockReturnValue(false),
      postCallback: jest.fn(),
    };
    const transport = createCallbackDeliveryService(jest.fn(), relayClient).createTransport(
      callbackUrl
    );

    await transport(failurePayload, new AbortController().signal);

    expect(relayClient.postCallback).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('posts through the first registered transport that handles the URL', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const relayClient = {
      isRelayOrigin: jest.fn().mockReturnValue(true),
      postCallback: jest.fn(),
    };
    const service = createCallbackDeliveryService(jest.fn(), relayClient);
    const skipped = { id: 'skipped', handles: jest.fn().mockReturnValue(false), send: jest.fn() };
    const first = {
      id: 'first',
      handles: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue({ status: 202 }),
    };
    const second = { id: 'second', handles: jest.fn().mockReturnValue(true), send: jest.fn() };
    const { registerTransport } = service.setup();
    registerTransport(skipped);
    registerTransport(first);
    registerTransport(second);

    const abortController = new AbortController();
    const response = await service.createTransport(callbackUrl)(
      failurePayload,
      abortController.signal
    );

    expect(response).toEqual({ status: 202 });
    expect(first.send).toHaveBeenCalledWith(callbackUrl, failurePayload, abortController.signal);
    expect(skipped.send).not.toHaveBeenCalled();
    expect(second.send).not.toHaveBeenCalled();
    expect(relayClient.postCallback).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the Relay and fetch selection when no registered transport handles the URL', async () => {
    const relayClient = {
      isRelayOrigin: jest.fn().mockReturnValue(true),
      postCallback: jest.fn().mockResolvedValue({ status: 204 }),
    };
    const service = createCallbackDeliveryService(jest.fn(), relayClient);
    service.setup().registerTransport({
      id: 'other',
      handles: () => false,
      send: jest.fn(),
    });

    await service.createTransport(callbackUrl)(failurePayload, new AbortController().signal);

    expect(relayClient.postCallback).toHaveBeenCalledTimes(1);
  });

  it('rejects a transport registered twice with the same id', () => {
    const { registerTransport } = createCallbackDeliveryService().setup();
    const transport = { id: 'transport-1', handles: () => true, send: jest.fn() };
    registerTransport(transport);

    expect(() => registerTransport(transport)).toThrow(
      'Callback transport [transport-1] is already registered'
    );
  });
});

describe('resolveOrigin', () => {
  const context = {
    origin: { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' },
    spaceId: 'default',
    request: {} as KibanaRequest,
  };

  it('returns the registered resolver answer without asking the default', async () => {
    const service = createCallbackDeliveryService();
    const registered = jest.fn().mockResolvedValue({ conversationId: 'investigation-1' });
    const defaultOriginResolver = jest.fn();
    service.setup().registerOriginResolver(registered);
    service.start({ defaultOriginResolver });

    await expect(service.resolveOrigin(context)).resolves.toEqual({
      conversationId: 'investigation-1',
    });
    expect(registered).toHaveBeenCalledWith(context);
    expect(defaultOriginResolver).not.toHaveBeenCalled();
  });

  it('falls through to the default when the registered resolver finds nothing', async () => {
    const service = createCallbackDeliveryService();
    service.setup().registerOriginResolver(jest.fn().mockResolvedValue(undefined));
    service.start({
      defaultOriginResolver: jest.fn().mockResolvedValue({ conversationId: 'conversation-1' }),
    });

    await expect(service.resolveOrigin(context)).resolves.toEqual({
      conversationId: 'conversation-1',
    });
  });

  it('runs only the default when no resolver is registered', async () => {
    const service = createCallbackDeliveryService();
    const defaultOriginResolver = jest.fn().mockResolvedValue(undefined);
    service.start({ defaultOriginResolver });

    await expect(service.resolveOrigin(context)).resolves.toBeUndefined();
    expect(defaultOriginResolver).toHaveBeenCalledWith(context);
  });

  it('propagates a registered resolver error without asking the default', async () => {
    const service = createCallbackDeliveryService();
    const defaultOriginResolver = jest.fn();
    service.setup().registerOriginResolver(jest.fn().mockRejectedValue(new Error('lookup failed')));
    service.start({ defaultOriginResolver });

    await expect(service.resolveOrigin(context)).rejects.toThrow('lookup failed');
    expect(defaultOriginResolver).not.toHaveBeenCalled();
  });

  it('rejects a second resolver', () => {
    const { registerOriginResolver } = createCallbackDeliveryService().setup();
    registerOriginResolver(jest.fn());

    expect(() => registerOriginResolver(jest.fn())).toThrow(
      'A callback origin resolver is already registered'
    );
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
