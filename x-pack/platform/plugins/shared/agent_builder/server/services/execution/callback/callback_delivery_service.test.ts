/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { AgentBuilderErrorCode, ConversationOriginType } from '@kbn/agent-builder-common';
import { CallbackDeliveryError } from '@kbn/agent-builder-server';
import type { ChatCallbackFailureResponse } from '../../../../common/http_api/chat_callback';
import {
  createConversationClientMock,
  createEmptyConversation,
} from '../../../test_utils/conversations';
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

describe('transport selection', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const deliver = (service: CallbackDeliveryService) =>
    service.makeCallbackRequest({ callbackUrl, payload: failurePayload, retry: false });

  it('posts the exact serialized JSON body through fetch without a signature', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);

    await deliver(createCallbackDeliveryService());

    expect(fetchMock).toHaveBeenCalledWith(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(failurePayload),
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('posts through the built-in Relay transport for Relay callback URLs', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const relayClient = {
      isRelayOrigin: jest.fn().mockReturnValue(true),
      postCallback: jest.fn().mockResolvedValue({ status: 204 }),
    };

    await deliver(createCallbackDeliveryService(jest.fn(), relayClient));

    expect(relayClient.isRelayOrigin).toHaveBeenCalledWith(callbackUrl);
    expect(relayClient.postCallback).toHaveBeenCalledWith(
      callbackUrl,
      failurePayload,
      expect.any(AbortSignal)
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts through fetch when the URL is not a Relay origin', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
    const relayClient = {
      isRelayOrigin: jest.fn().mockReturnValue(false),
      postCallback: jest.fn(),
    };

    await deliver(createCallbackDeliveryService(jest.fn(), relayClient));

    expect(relayClient.postCallback).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('posts through the first registered transport that handles the URL', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = createCallbackDeliveryService();
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

    await deliver(service);

    expect(first.send).toHaveBeenCalledWith(callbackUrl, failurePayload, expect.any(AbortSignal));
    expect(skipped.send).not.toHaveBeenCalled();
    expect(second.send).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a transport registered twice with the same id', () => {
    const { registerTransport } = createCallbackDeliveryService().setup();
    const transport = { id: 'transport-1', handles: () => true, send: jest.fn() };
    registerTransport(transport);

    expect(() => registerTransport(transport)).toThrow(
      'Callback transport [transport-1] is already registered'
    );
  });

  it.each(['default', 'relay'])('rejects a transport that takes the built-in id %p', (id) => {
    const { registerTransport } = createCallbackDeliveryService().setup();

    expect(() => registerTransport({ id, handles: () => true, send: jest.fn() })).toThrow(
      `Callback transport [${id}] is already registered`
    );
  });
});

describe('resolveConversation', () => {
  const context = {
    origin: { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' },
    spaceId: 'default',
    request: {} as KibanaRequest,
  };

  const startService = (byOrigin?: string) => {
    const client = createConversationClientMock();
    client.getByOrigin.mockResolvedValue(
      byOrigin ? createEmptyConversation({ id: byOrigin }) : undefined
    );
    const service = createCallbackDeliveryService();
    const callbacks = service.setup();
    service.start({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue(client),
        getScopedClientAsUser: jest.fn(),
      },
    });
    return { service, callbacks, client };
  };

  it('returns the registered resolver answer without asking the default', async () => {
    const { service, callbacks, client } = startService('conversation-1');
    const registered = jest.fn().mockResolvedValue({ conversationId: 'investigation-1' });
    callbacks.registerConversationResolver(registered);

    await expect(service.resolveConversation(context)).resolves.toEqual({
      conversationId: 'investigation-1',
    });
    expect(registered).toHaveBeenCalledWith(context);
    expect(client.getByOrigin).not.toHaveBeenCalled();
  });

  it('falls through to the default lookup when the registered resolver finds nothing', async () => {
    const { service, callbacks, client } = startService('conversation-1');
    callbacks.registerConversationResolver(jest.fn().mockResolvedValue(undefined));

    await expect(service.resolveConversation(context)).resolves.toEqual({
      conversationId: 'conversation-1',
    });
    expect(client.getByOrigin).toHaveBeenCalledWith({ external_conversation_id: 'thread-1' });
  });

  it('runs only the default lookup when no resolver is registered', async () => {
    const { service, client } = startService();

    await expect(service.resolveConversation(context)).resolves.toBeUndefined();
    expect(client.getByOrigin).toHaveBeenCalledTimes(1);
  });

  it('propagates a registered resolver error without asking the default', async () => {
    const { service, callbacks, client } = startService('conversation-1');
    callbacks.registerConversationResolver(jest.fn().mockRejectedValue(new Error('lookup failed')));

    await expect(service.resolveConversation(context)).rejects.toThrow('lookup failed');
    expect(client.getByOrigin).not.toHaveBeenCalled();
  });

  it('rejects a second resolver', () => {
    const { registerConversationResolver } = createCallbackDeliveryService().setup();
    registerConversationResolver(jest.fn());

    expect(() => registerConversationResolver(jest.fn())).toThrow(
      'A callback conversation resolver is already registered'
    );
  });
});

describe('makeCallbackRequest', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const deliverThrough = (transport: jest.Mock, retry: boolean) => {
    const service = createCallbackDeliveryService();
    service.setup().registerTransport({ id: 'test', handles: () => true, send: transport });
    return service.makeCallbackRequest({ callbackUrl, payload: failurePayload, retry });
  };

  const serverError = () => new CallbackDeliveryError('server error', { retryable: true });
  const rejected = () => new CallbackDeliveryError('rejected', { retryable: false });

  it('posts the payload once when the request succeeds', async () => {
    const transport = jest.fn().mockResolvedValue(undefined);

    await deliverThrough(transport, true);

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith(callbackUrl, failurePayload, expect.any(AbortSignal));
  });

  it('aborts and retries requests that exceed the Actions response timeout', async () => {
    jest.useFakeTimers();
    const transport = jest.fn().mockImplementation(
      (_callbackUrl, _payload, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('The operation was aborted')));
        })
    );

    const delivery = deliverThrough(transport, true);
    const deliveryExpectation = expect(delivery).rejects.toThrow('The operation was aborted');

    await jest.advanceTimersByTimeAsync(responseTimeout * 4);

    await deliveryExpectation;
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('retries network errors and retryable delivery errors when retry is true', async () => {
    jest.useFakeTimers();
    const transport = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce(undefined);

    const delivery = deliverThrough(transport, true);
    const deliveryExpectation = expect(delivery).resolves.toBeUndefined();

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('does not retry when retry is false', async () => {
    const transport = jest.fn().mockRejectedValue(serverError());

    await expect(deliverThrough(transport, false)).rejects.toThrow('server error');

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('does not retry a delivery error that is not retryable', async () => {
    const transport = jest.fn().mockRejectedValue(rejected());

    await expect(deliverThrough(transport, true)).rejects.toThrow('rejected');

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retryable delivery errors', async () => {
    jest.useFakeTimers();
    const transport = jest.fn().mockRejectedValue(serverError());

    const delivery = deliverThrough(transport, true);
    const deliveryExpectation = expect(delivery).rejects.toThrow('server error');

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(transport).toHaveBeenCalledTimes(3);
  });
});
