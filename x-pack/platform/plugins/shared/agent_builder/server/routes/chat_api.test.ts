/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, Subject, throwError, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ChatEventType,
  TimelineEventType,
  ToolResultType,
  NON_INTERACTIVE_DECLINED_REASON,
  agentBuilderDefaultAgentId,
  agentIdMaxLength,
  CHAT_MESSAGE_MAX_LENGTH,
  createAgentNotFoundError,
} from '@kbn/agent-builder-common';
import { chatApiPath } from '../../common/constants';
import {
  chatMessagePayloadSchema,
  chatMessageResponseSchema,
  chatPayloadSchema,
  registerChatApiRoutes,
} from './chat_api';

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
  it('registers the two /api/chat converse routes as public + tech preview', () => {
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
          availability: { stability: 'tech_preview', since: '9.6.0' },
        }),
      })
    );
    expect(postConfigs).toContainEqual(
      expect.objectContaining({
        path: `${chatApiPath}/converse/async`,
        access: 'public',
        options: expect.objectContaining({
          availability: { stability: 'tech_preview', since: '9.6.0' },
        }),
      })
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

describe('POST /api/chat/message', () => {
  const messagePath = `${chatApiPath}/message`;
  const conversationId = '00000000-0000-4000-8000-000000000001';

  const respondedEvent = (message: string) => ({
    id: 'exec-1::execution_terminated',
    type: TimelineEventType.executionTerminated,
    created_at: '2024-01-01T00:00:00.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'exec-1',
    trigger_event_id: 'exec-1::user_message',
    data: {
      model_usage: {},
      time_to_first_token: 1,
      time_to_last_token: 2,
      outcome: { type: 'responded', response: { message } },
    },
  });

  const declinedToolResultEvent = {
    type: ChatEventType.toolResult,
    data: {
      tool_call_id: 'call-1',
      tool_id: 'reindex-logs',
      results: [
        {
          tool_result_id: 'abc123',
          type: ToolResultType.error,
          data: {
            message: 'execution was declined',
            metadata: { declined_reason: NON_INTERACTIVE_DECLINED_REASON },
          },
        },
      ],
    },
  };

  // Registers the routes against a stubbed execution service and calls the message handler.
  const sendMessage = async ({
    body,
    events = [conversationCreatedEvent, respondedEvent('Hi!')],
    executeAgent = jest.fn().mockResolvedValue({ events$: of(...events) }),
    flagEnabled = true,
  }: {
    body: Record<string, unknown>;
    events?: unknown[];
    executeAgent?: jest.Mock;
    flagEnabled?: boolean;
  }) => {
    const { router, handlers } = captureHandlers();

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[messagePath](activeContext(flagEnabled), { body }, response);

    return { executeAgent, response, result };
  };

  it('registers the route as public + experimental with request and response validation', () => {
    const registrations: Array<{ config: any; version: any }> = [];
    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest.fn().mockImplementation((version: unknown) => {
            registrations.push({ config, version });
          }),
        })),
      },
    };

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn(),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const registration = registrations.find(({ config }) => config.path === messagePath);
    if (!registration) {
      throw new Error(`${messagePath} was not registered`);
    }
    expect(registration.config).toEqual(
      expect.objectContaining({
        access: 'public',
        options: expect.objectContaining({
          tags: ['oas-tag:agent builder'],
          availability: { stability: 'experimental', since: '9.6.0' },
        }),
      })
    );
    expect(registration.config.description).toContain('agentBuilder:experimentalFeatures');
    expect(registration.version.options.oasOperationObject()).toMatch(/chat_message\.yaml$/);
    expect(registration.version).toEqual(
      expect.objectContaining({
        version: '2023-10-31',
        validate: {
          request: { body: chatMessagePayloadSchema },
          // Only the success body is validated; error responses are documented in the yaml.
          response: { 200: expect.objectContaining({ body: chatMessageResponseSchema }) },
        },
      })
    );
  });

  it('runs the agent non-interactively, without creating a conversation for an unknown id, and answers with text only', async () => {
    const { executeAgent, result } = await sendMessage({
      body: { message: 'Hello', agent_id: 'agent-1', conversation_id: conversationId },
    });

    expect(executeAgent).toHaveBeenCalledTimes(1);
    const [executeParams] = executeAgent.mock.calls[0];
    expect(executeParams).toEqual(
      expect.objectContaining({
        interactive: { enabled: false },
        params: expect.objectContaining({
          agentId: 'agent-1',
          conversationId,
          autoCreateConversationWithId: false,
          nextInput: expect.objectContaining({ message: 'Hello' }),
        }),
      })
    );
    // The execution mode is left to the service so real requests run on Task Manager.
    expect(executeParams.useTaskManager).toBeUndefined();
    expect(executeParams.params.nextInput.attachments).toBeUndefined();
    expect(executeParams.params.nextInput.prompts).toBeUndefined();

    // No prompt was declined, so `declined_prompts` is left out rather than sent empty.
    expect(result).toStrictEqual({
      status: 200,
      payload: { conversation_id: 'conv-1', answer: 'Hi!' },
    });
  });

  it('reports the auto-declined prompts next to the answer', async () => {
    const { result } = await sendMessage({
      body: { message: 'Reindex the logs' },
      events: [declinedToolResultEvent, conversationCreatedEvent, respondedEvent('I could not.')],
    });

    expect(result).toStrictEqual({
      status: 200,
      payload: {
        conversation_id: 'conv-1',
        answer: 'I could not.',
        declined_prompts: [{ tool_id: 'reindex-logs', message: 'execution was declined' }],
      },
    });
  });

  it('answers 404 and never runs the agent when the experimental feature flag is disabled', async () => {
    const { executeAgent, response, result } = await sendMessage({
      body: { message: 'Hello' },
      flagEnabled: false,
    });

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(executeAgent).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 404 });
  });

  it('maps an agent-not-found execution error to a 404 through the handler wrapper', async () => {
    const { result } = await sendMessage({
      body: { message: 'Hello', agent_id: 'missing-agent' },
      executeAgent: jest
        .fn()
        .mockRejectedValue(createAgentNotFoundError({ agentId: 'missing-agent' })),
    });

    expect(result).toEqual({
      status: 404,
      payload: expect.objectContaining({ message: 'Agent missing-agent not found' }),
    });
  });

  it('answers 500 when the run ends without an execution_terminated event', async () => {
    const { result } = await sendMessage({
      body: { message: 'Hello' },
      events: [conversationCreatedEvent],
    });

    expect(result.status).toBe(500);
  });

  it('answers 500 when the run paused on a prompt instead of declining it', async () => {
    const paused = {
      ...respondedEvent(''),
      data: { ...respondedEvent('').data, outcome: { type: 'prompt_requested', prompts: [] } },
    };
    const { result } = await sendMessage({
      body: { message: 'Hello' },
      events: [conversationCreatedEvent, paused],
    });

    expect(result.status).toBe(500);
  });

  it('surfaces a 500 when the agent stream errors mid-run', async () => {
    const { result } = await sendMessage({
      body: { message: 'Hello' },
      executeAgent: jest
        .fn()
        .mockResolvedValue({ events$: throwError(() => new Error('stream boom')) }),
    });

    expect(result.status).toBe(500);
  });
});

describe('chatMessagePayloadSchema', () => {
  const conversationId = '00000000-0000-4000-8000-000000000001';

  it('accepts a message alone and defaults the agent', () => {
    expect(chatMessagePayloadSchema.validate({ message: 'hi' })).toEqual({
      message: 'hi',
      agent_id: agentBuilderDefaultAgentId,
    });
  });

  it('accepts the full request shape', () => {
    expect(
      chatMessagePayloadSchema.validate({
        message: 'hi',
        agent_id: 'my-agent',
        conversation_id: conversationId,
      })
    ).toEqual({ message: 'hi', agent_id: 'my-agent', conversation_id: conversationId });
  });

  it('requires a non-empty, bounded message', () => {
    expect(() => chatMessagePayloadSchema.validate({})).toThrow(/message/);
    expect(() => chatMessagePayloadSchema.validate({ message: '' })).toThrow(/message/);
    expect(() =>
      chatMessagePayloadSchema.validate({ message: 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1) })
    ).toThrow(/message/);
    expect(() =>
      chatMessagePayloadSchema.validate({ message: 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH) })
    ).not.toThrow();
  });

  it('bounds agent_id like agent ids are', () => {
    expect(() => chatMessagePayloadSchema.validate({ message: 'hi', agent_id: '' })).toThrow(
      /agent_id/
    );
    expect(() =>
      chatMessagePayloadSchema.validate({
        message: 'hi',
        agent_id: 'a'.repeat(agentIdMaxLength + 1),
      })
    ).toThrow(/agent_id/);
  });

  it('requires conversation_id to be a UUID', () => {
    expect(() =>
      chatMessagePayloadSchema.validate({ message: 'hi', conversation_id: 'not-a-uuid' })
    ).toThrow(/conversation_id must be a valid UUID/);
  });

  it.each([
    ['attachments', [{ type: 'text', data: { content: 'x' } }]],
    ['connector_id', 'connector-1'],
    ['inference_id', 'inference-1'],
    ['prompts', { p1: { allow: true } }],
    ['configuration_overrides', { tools: [] }],
    ['_execution_mode', 'local'],
    ['trigger_mode', 'never'],
  ])('rejects the converse-only key %s', (key, value) => {
    expect(() => chatMessagePayloadSchema.validate({ message: 'hi', [key]: value })).toThrow(
      new RegExp(`\\[${key}\\]: Additional properties are not allowed`)
    );
  });
});

describe('chatMessageResponseSchema', () => {
  it('requires the conversation id and the answer, and only accepts a non-empty declined prompts list', () => {
    const responseSchema = chatMessageResponseSchema();

    expect(() => responseSchema.validate({ conversation_id: 'conv-1', answer: '' })).not.toThrow();
    expect(() =>
      responseSchema.validate({
        conversation_id: 'conv-1',
        answer: 'x',
        declined_prompts: [{ tool_id: 'tool', message: 'declined' }],
      })
    ).not.toThrow();
    // An empty list is never sent: the field is omitted instead.
    expect(() =>
      responseSchema.validate({ conversation_id: 'conv-1', answer: 'x', declined_prompts: [] })
    ).toThrow(/declined_prompts/);
    expect(() => responseSchema.validate({ conversation_id: 'conv-1' })).toThrow(/answer/);
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
