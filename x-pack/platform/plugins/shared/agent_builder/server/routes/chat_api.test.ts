/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, Subject, throwError, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ChatEventType, TimelineEventType } from '@kbn/agent-builder-common';
import { chatApiPath } from '../../common/constants';
import { chatPayloadSchema, registerChatApiRoutes } from './chat_api';

const mockObservableIntoEventSourceStream = jest.fn();
jest.mock('@kbn/sse-utils-server', () => ({
  observableIntoEventSourceStream: (observable: unknown, options: unknown) =>
    mockObservableIntoEventSourceStream(observable, options),
  cloudProxyBufferSize: 4096,
}));

const conversationCreatedEvent = {
  type: ChatEventType.conversationCreated,
  data: { conversation_id: 'conv-1', access_control: { access_mode: 'private', entries: [] } },
};

const activeContext = (flagEnabled: boolean) => ({
  core: Promise.resolve({
    uiSettings: { client: { get: jest.fn().mockResolvedValue(flagEnabled) } },
  }),
  licensing: Promise.resolve({
    license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
  }),
});

const buildResponse = () => ({
  ok: jest.fn(({ body }: { body: unknown }) => ({ status: 200, payload: body })),
  notFound: jest.fn(() => ({ status: 404 })),
  customError: jest.fn(({ body, statusCode }: { body: unknown; statusCode: number }) => ({
    status: statusCode,
    payload: body,
  })),
  forbidden: jest.fn(() => ({ status: 403 })),
});

// Captures the handler registered for a given path so the test can invoke it directly.
const captureHandlers = () => {
  const handlers: Record<string, Function> = {};
  const router = {
    versioned: {
      post: jest.fn().mockImplementation((config: { path: string }) => ({
        addVersion: jest.fn().mockImplementation((_v: unknown, handler: Function) => {
          handlers[config.path] = handler;
        }),
      })),
    },
  };
  return { router, handlers };
};

describe('registerChatApiRoutes', () => {
  it('registers the two /api/chat converse routes as public + experimental', () => {
    const postConfigs: Array<{ path: string; access?: string; options?: any }> = [];
    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => {
          postConfigs.push(config);
          return { addVersion: jest.fn() };
        }),
      },
    };

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn(),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    expect(postConfigs).toContainEqual(
      expect.objectContaining({
        path: `${chatApiPath}/converse`,
        access: 'public',
        options: expect.objectContaining({
          availability: expect.objectContaining({ stability: 'experimental' }),
        }),
      })
    );
    expect(postConfigs).toContainEqual(
      expect.objectContaining({ path: `${chatApiPath}/converse/async`, access: 'public' })
    );
  });

  it('returns the conversation with its timeline after a sync converse', async () => {
    const { router, handlers } = captureHandlers();
    const maybeExecuteAgent = jest
      .fn()
      .mockResolvedValue({ events$: of(conversationCreatedEvent) });
    const conversation = { id: 'conv-1', events: [{ id: 'e1' }], rounds: [] };
    const get = jest.fn().mockResolvedValue(conversation);
    const getScopedClient = jest.fn().mockResolvedValue({ get });

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(maybeExecuteAgent).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('conv-1');
    expect(result).toEqual({ status: 200, payload: conversation });
  });

  it('serves the sync route when the experimental feature flag is disabled', async () => {
    const { router, handlers } = captureHandlers();
    const maybeExecuteAgent = jest
      .fn()
      .mockResolvedValue({ events$: of(conversationCreatedEvent) });
    const conversation = { id: 'conv-1', events: [], rounds: [] };
    const getScopedClient = jest
      .fn()
      .mockResolvedValue({ get: jest.fn().mockResolvedValue(conversation) });

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(false),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(response.notFound).not.toHaveBeenCalled();
    expect(maybeExecuteAgent).toHaveBeenCalled();
    expect(result).toEqual({ status: 200, payload: conversation });
  });

  it('returns a 500 when the run emits no conversation event', async () => {
    const { router, handlers } = captureHandlers();
    const maybeExecuteAgent = jest.fn().mockResolvedValue({ events$: of() });
    const get = jest.fn();

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(result.status).toBe(500);
    expect(get).not.toHaveBeenCalled();
  });

  it('surfaces a 500 when the agent stream errors mid-run', async () => {
    const { router, handlers } = captureHandlers();
    const maybeExecuteAgent = jest
      .fn()
      .mockResolvedValue({ events$: throwError(() => new Error('stream boom')) });

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(result.status).toBe(500);
  });

  it('streams the events-native shape: keeps execution_started + execution_terminated, drops round_complete', async () => {
    const { router, handlers } = captureHandlers();
    const roundCompleteEvent = { type: ChatEventType.roundComplete, data: {} };
    const executionStartedEvent = {
      id: 'r::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2024-01-01T00:00:00.000Z',
      actor: { type: 'agent', id: 'a' },
      execution_id: 'r::execution',
      trigger_event_id: 'r::user_message',
      data: { trigger_type: 'user_message' },
    };
    const executionTerminatedEvent = {
      id: 'r::execution_terminated',
      type: TimelineEventType.executionTerminated,
      created_at: '2024-01-01T00:00:00.000Z',
      actor: { type: 'agent', id: 'a' },
      execution_id: 'r::execution',
      trigger_event_id: 'r::user_message',
      data: {},
    };
    const conversationUpdated = {
      type: ChatEventType.conversationUpdated,
      data: {
        conversation_id: 'c',
        title: 't',
        access_control: { access_mode: 'private', entries: [] },
      },
    };
    const maybeExecuteAgent = jest.fn().mockResolvedValue({
      events$: of(
        roundCompleteEvent,
        executionStartedEvent,
        executionTerminatedEvent,
        conversationUpdated
      ),
    });
    mockObservableIntoEventSourceStream.mockReset();
    mockObservableIntoEventSourceStream.mockReturnValue('BODY');

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {
        getStartServices: jest.fn().mockResolvedValue([{}, { cloud: { isCloudEnabled: false } }]),
      },
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const abortedSubject = new Subject<void>();
    await handlers[`${chatApiPath}/converse/async`](
      activeContext(true),
      {
        body: { agent_id: 'agent-1', input: 'Hello' },
        events: { aborted$: abortedSubject.asObservable() },
      },
      response
    );

    expect(mockObservableIntoEventSourceStream).toHaveBeenCalledTimes(1);
    const [passedObservable] = mockObservableIntoEventSourceStream.mock.calls[0] as [
      { pipe: (...operators: any[]) => any }
    ];
    const emitted = (await firstValueFrom(passedObservable.pipe(toArray()))) as Array<{
      type: string;
    }>;
    expect(emitted.map((event) => event.type)).toEqual([
      TimelineEventType.executionStarted,
      TimelineEventType.executionTerminated,
      ChatEventType.conversationUpdated,
    ]);
  });

  it('serves the streaming route when the experimental feature flag is disabled', async () => {
    const { router, handlers } = captureHandlers();
    const maybeExecuteAgent = jest
      .fn()
      .mockResolvedValue({ events$: of(conversationCreatedEvent) });
    mockObservableIntoEventSourceStream.mockReset();
    mockObservableIntoEventSourceStream.mockReturnValue('BODY');

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {
        getStartServices: jest.fn().mockResolvedValue([{}, { cloud: { isCloudEnabled: false } }]),
      },
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const abortedSubject = new Subject<void>();
    const result = await handlers[`${chatApiPath}/converse/async`](
      activeContext(false),
      {
        body: { agent_id: 'agent-1', input: 'Hello' },
        events: { aborted$: abortedSubject.asObservable() },
      },
      response
    );

    expect(response.notFound).not.toHaveBeenCalled();
    expect(maybeExecuteAgent).toHaveBeenCalled();
    expect(mockObservableIntoEventSourceStream).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 200, payload: 'BODY' });
  });
});

describe('user message requests', () => {
  const conversation = { id: 'conv-1', events: [{ id: 'e1' }], rounds: [] };

  const converse = async (body: Record<string, unknown>) => {
    const { router, handlers } = captureHandlers();
    const maybeExecuteAgent = jest
      .fn()
      .mockResolvedValue({ events$: of(conversationCreatedEvent) });
    const get = jest.fn().mockResolvedValue(conversation);

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { maybeExecuteAgent },
        conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body },
      response
    );

    return { maybeExecuteAgent, result };
  };

  it('hands the trigger mode to the execution service, with everything else it was sent', async () => {
    const { maybeExecuteAgent, result } = await converse({
      trigger_mode: 'never',
      conversation_id: '00000000-0000-4000-8000-000000000001',
      input: 'Pool limit is now 200',
      connector_id: 'connector-1',
    });

    expect(maybeExecuteAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          triggerMode: 'never',
          conversationId: '00000000-0000-4000-8000-000000000001',
          connectorId: 'connector-1',
          nextInput: expect.objectContaining({ message: 'Pool limit is now 200' }),
        }),
      })
    );
    // The route reads the conversation the same way for either mode.
    expect(result).toEqual({ status: 200, payload: conversation });
  });

  it('leaves the mode to the service when the request omits it', async () => {
    // The schema defaults `trigger_mode` to always; a request that never reaches it carries none.
    const { maybeExecuteAgent } = await converse({ input: 'Hello' });

    const [{ params }] = maybeExecuteAgent.mock.calls[0];
    expect(params).not.toHaveProperty('triggerMode');
  });
});

describe('chatPayloadSchema', () => {
  it('accepts trigger_mode for sync chat requests', () => {
    expect(chatPayloadSchema.validate({ input: 'hi' }).trigger_mode).toBe('always');
    expect(
      chatPayloadSchema.validate({
        trigger_mode: 'never',
        conversation_id: '00000000-0000-4000-8000-000000000001',
        input: 'hi',
      })
    ).toMatchObject({ trigger_mode: 'never' });
  });

  it('rejects unsupported trigger_mode values', () => {
    expect(() => chatPayloadSchema.validate({ trigger_mode: 'auto' })).toThrow();
  });

  it('accepts execution options alongside trigger_mode never', () => {
    expect(() =>
      chatPayloadSchema.validate({
        trigger_mode: 'never',
        conversation_id: '00000000-0000-4000-8000-000000000001',
        input: 'hi',
        connector_id: 'connector-1',
        read_only: true,
      })
    ).not.toThrow();
  });
});
