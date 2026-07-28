/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, of, throwError, concat } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AgentBuilderErrorCode,
  AgentExecutionMode,
  ChatEventType,
  createRequestAbortedError,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { ChatCallbackFailureResponse } from '../../../common/http_api/chat_callback';
import { CallbackDeliveryService, deliverStream } from './callback_delivery_service';

const callbackUrl = 'https://relay.example.com/v1/events?token=abc';
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

const createEvent = (text: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { text_chunk: text, message_id: 'message-1' },
  } as ChatEvent);

const createRoundCompleteEvent = (): ChatEvent =>
  ({
    type: ChatEventType.roundComplete,
    data: { round: { id: 'round-1' } },
  } as unknown as ChatEvent);

const failurePayload: ChatCallbackFailureResponse = {
  execution_id: 'execution-1',
  error: {
    code: AgentBuilderErrorCode.internalError,
    message: 'boom',
  },
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

describe('createMakeRequest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the exact serialized JSON body through fetch without a signature', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
    const makeRequest = createCallbackDeliveryService().createMakeRequest(callbackUrl);

    const abortController = new AbortController();
    await makeRequest(failurePayload, abortController.signal);

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
    const makeRequest = createCallbackDeliveryService(jest.fn(), relayClient).createMakeRequest(
      callbackUrl
    );

    const abortController = new AbortController();
    await makeRequest(failurePayload, abortController.signal);

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
    const makeRequest = createCallbackDeliveryService(jest.fn(), relayClient).createMakeRequest(
      callbackUrl
    );

    await makeRequest(failurePayload, new AbortController().signal);

    expect(relayClient.postCallback).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('makeCallbackRequest', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('posts the payload once when the request succeeds', async () => {
    const makeRequest = jest.fn().mockResolvedValue({ status: 200 });

    await createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      makeRequest,
      retry: true,
    });

    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(makeRequest).toHaveBeenCalledWith(failurePayload, expect.any(AbortSignal));
  });

  it('aborts and retries requests that exceed the Actions response timeout', async () => {
    jest.useFakeTimers();
    const makeRequest = jest.fn().mockImplementation(
      (_payload, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('The operation was aborted')));
        })
    );

    const delivery = createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      makeRequest,
      retry: true,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow('The operation was aborted');

    await jest.advanceTimersByTimeAsync(responseTimeout * 4);

    await deliveryExpectation;
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it('retries network errors and 5xx responses when retry is true', async () => {
    jest.useFakeTimers();
    const makeRequest = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 204 });

    const delivery = createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      makeRequest,
      retry: true,
    });
    const deliveryExpectation = expect(delivery).resolves.toBeUndefined();

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it('does not retry when retry is false', async () => {
    const makeRequest = jest.fn().mockResolvedValue({ status: 503 });

    await expect(
      createCallbackDeliveryService().makeCallbackRequest({
        payload: failurePayload,
        makeRequest,
        retry: false,
      })
    ).rejects.toThrow('Callback delivery failed with status 503');

    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('does not retry 4xx responses', async () => {
    const makeRequest = jest.fn().mockResolvedValue({ status: 400 });

    await expect(
      createCallbackDeliveryService().makeCallbackRequest({
        payload: failurePayload,
        makeRequest,
        retry: true,
      })
    ).rejects.toThrow('Callback delivery failed with status 400');

    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retryable 5xx responses', async () => {
    jest.useFakeTimers();
    const makeRequest = jest.fn().mockResolvedValue({ status: 503 });

    const delivery = createCallbackDeliveryService().makeCallbackRequest({
      payload: failurePayload,
      makeRequest,
      retry: true,
    });
    const deliveryExpectation = expect(delivery).rejects.toThrow(
      'Callback delivery failed with status 503'
    );

    await jest.advanceTimersByTimeAsync(700);

    await deliveryExpectation;
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });
});

const createCallbackDeliveryServiceMock = () => {
  const makeRequest = jest.fn().mockResolvedValue({ status: 200 });
  const service = {
    getCallbackUrl: jest.fn((execution: AgentExecution) =>
      execution.executionMode === AgentExecutionMode.conversation
        ? execution.agentParams.callback?.url
        : undefined
    ),
    validateCallbackUrl: jest.fn(),
    createMakeRequest: jest.fn().mockReturnValue(makeRequest),
    makeCallbackRequest: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CallbackDeliveryService>;
  return { service, makeRequest };
};

describe('deliverStream', () => {
  it('resolves without subscribing when no callback is configured', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const subscribed = jest.fn();
    const events$ = defer(() => {
      subscribed();
      return of(createEvent('hello'));
    });

    await deliverStream({
      execution: createConversationExecution(null),
      events$,
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(subscribed).not.toHaveBeenCalled();
    expect(service.makeCallbackRequest).not.toHaveBeenCalled();
  });

  it('resolves without delivering for standalone executions', async () => {
    const { service } = createCallbackDeliveryServiceMock();

    await deliverStream({
      execution: createStandaloneExecution(),
      events$: of(createEvent('hello')),
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).not.toHaveBeenCalled();
  });

  it('logs and resolves without subscribing when the callback URL fails validation', async () => {
    const logger = loggerMock.create();
    const { service } = createCallbackDeliveryServiceMock();
    service.validateCallbackUrl.mockImplementation(() => {
      throw new Error('target url is not added to the Kibana config xpack.actions.allowedHosts');
    });

    await deliverStream({
      execution: createConversationExecution(),
      events$: of(createEvent('hello')),
      callbackDeliveryService: service,
      logger,
    });

    expect(service.makeCallbackRequest).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('not added to the Kibana config xpack.actions.allowedHosts')
    );
  });

  it('delivers one running envelope per event, in order, through a single request function', async () => {
    const { service, makeRequest } = createCallbackDeliveryServiceMock();
    const events = [createEvent('one'), createEvent('two'), createEvent('three')];

    await deliverStream({
      execution: createConversationExecution(),
      events$: of(...events),
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(service.validateCallbackUrl).toHaveBeenCalledWith(callbackUrl);
    expect(service.createMakeRequest).toHaveBeenCalledTimes(1);
    expect(service.createMakeRequest).toHaveBeenCalledWith(callbackUrl);
    expect(service.makeCallbackRequest.mock.calls).toEqual(
      events.map((event) => [
        {
          payload: {
            execution_id: 'execution-1',
            event,
          },
          makeRequest,
          retry: false,
        },
      ])
    );
  });

  it('retries only round_complete events; other events are delivered at-most-once', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const progressEvent = createEvent('progress');
    const roundCompleteEvent = createRoundCompleteEvent();

    await deliverStream({
      execution: createConversationExecution(),
      events$: of(progressEvent, roundCompleteEvent),
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        payload: { execution_id: 'execution-1', event: progressEvent },
        retry: false,
      })
    );
    expect(service.makeCallbackRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        payload: { execution_id: 'execution-1', event: roundCompleteEvent },
        retry: true,
      })
    );
  });

  it('does not start the next delivery until the previous one settles', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const calls: string[] = [];
    service.makeCallbackRequest.mockImplementation(async ({ payload }) => {
      const text = (payload as { event: ChatEvent & { data: { text_chunk: string } } }).event.data
        .text_chunk;
      calls.push(`start:${text}`);
      await new Promise((resolve) => setImmediate(resolve));
      calls.push(`end:${text}`);
    });

    await deliverStream({
      execution: createConversationExecution(),
      events$: of(createEvent('one'), createEvent('two')),
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(calls).toEqual(['start:one', 'end:one', 'start:two', 'end:two']);
  });

  it('logs and continues with the next event when a delivery fails', async () => {
    const logger = loggerMock.create();
    const { service } = createCallbackDeliveryServiceMock();
    service.makeCallbackRequest
      .mockRejectedValueOnce(new Error('Callback delivery failed with status 400'))
      .mockResolvedValueOnce(undefined);
    const events = [createEvent('one'), createEvent('two')];

    await deliverStream({
      execution: createConversationExecution(),
      events$: of(...events),
      callbackDeliveryService: service,
      logger,
    });

    expect(service.makeCallbackRequest).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Callback delivery failed with status 400')
    );
  });

  it('delivers a failure payload with a failure error code when the stream errors', async () => {
    const { service, makeRequest } = createCallbackDeliveryServiceMock();

    await deliverStream({
      execution: createConversationExecution(),
      events$: concat(
        of(createEvent('one')),
        throwError(() => new Error('agent boom'))
      ),
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).toHaveBeenCalledTimes(2);
    expect(service.makeCallbackRequest).toHaveBeenLastCalledWith({
      payload: {
        execution_id: 'execution-1',
        error: {
          code: AgentBuilderErrorCode.internalError,
          message: 'agent boom',
        },
      },
      makeRequest,
      retry: false,
    });
  });

  it('delivers a failure payload with the requestAborted error code for aborts', async () => {
    const { service, makeRequest } = createCallbackDeliveryServiceMock();

    await deliverStream({
      execution: createConversationExecution(),
      events$: throwError(() => createRequestAbortedError('request aborted')),
      callbackDeliveryService: service,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).toHaveBeenCalledWith({
      payload: {
        execution_id: 'execution-1',
        error: {
          code: AgentBuilderErrorCode.requestAborted,
          message: 'request aborted',
          meta: {},
        },
      },
      makeRequest,
      retry: false,
    });
  });

  it('resolves even when the synthetic failure delivery fails', async () => {
    const logger = loggerMock.create();
    const { service } = createCallbackDeliveryServiceMock();
    service.makeCallbackRequest.mockRejectedValue(new Error('callback failed'));

    await expect(
      deliverStream({
        execution: createConversationExecution(),
        events$: throwError(() => new Error('agent boom')),
        callbackDeliveryService: service,
        logger,
      })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('callback failed'));
  });
});
