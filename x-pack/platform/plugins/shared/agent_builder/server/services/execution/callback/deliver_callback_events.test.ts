/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, of, throwError, concat } from 'rxjs';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { IBasePath } from '@kbn/core/server';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AgentBuilderErrorCode,
  AgentExecutionMode,
  ChatEventType,
  ConversationOriginType,
  createRequestAbortedError,
  isExecutionTerminatedEvent,
  isRoundCompleteEvent,
  TimelineEventType,
  type ChatCallbackEventResponse,
  type ChatCallbackExecutionTerminatedEvent,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { AttachmentServiceStart } from '../../attachments';
import type { ConversationService } from '../../conversation';
import { SurfacesServiceImpl } from '../../surfaces';
import type { CallbackDeliveryService } from './callback_delivery_service';
import { deliverCallbackEvents } from './deliver_callback_events';

const callbackUrl = 'https://callback.example.com/v1/events?token=abc';
const getTypeDefinition = jest.fn();
const request = httpServerMock.createKibanaRequest();
const conversationClient = { get: jest.fn() };
const conversationService = { getScopedClientAsUser: jest.fn() };
const owner = { id: 'user-1', username: 'elastic' };
/**
 * What the surface payload is rendered with: the stored conversation's attachments, the surfaces
 * service, and the request the execution runs as.
 */
const surfacesDeps = {
  conversationService: conversationService as unknown as ConversationService,
  surfacesService: new SurfacesServiceImpl({
    attachmentsService: { getTypeDefinition } as unknown as AttachmentServiceStart,
    logger: loggerMock.create(),
    isomer: isomerPluginMock.createStartContract(),
    basePath: { publicBaseUrl: 'https://kibana.example.com' } as IBasePath,
    cloud: undefined,
  }),
  request,
};
const createConversationExecution = (url: string | null = callbackUrl): AgentExecution =>
  ({
    executionId: 'execution-1',
    executionMode: AgentExecutionMode.conversation,
    spaceId: 'space-1',
    owner,
    agentParams: {
      conversationId: 'conversation-1',
      nextInput: { message: 'hello' },
      ...(url ? { callback: { url } } : {}),
    },
  } as unknown as AgentExecution);
const createSlackExecution = (): AgentExecution => {
  const execution = createConversationExecution();

  return {
    ...execution,
    agentParams: {
      ...execution.agentParams,
      origin: {
        type: ConversationOriginType.Slack,
        external_conversation_id: 'team:T1/channel:C1/thread:1',
      },
    },
  } as AgentExecution;
};
const createStandaloneExecution = (): AgentExecution =>
  ({
    executionId: 'execution-1',
    executionMode: AgentExecutionMode.standalone,
    agentParams: {
      nextInput: { message: 'hello' },
    },
  } as unknown as AgentExecution);

const createReasoningEvent = (reasoning: string): ChatEvent =>
  ({
    type: ChatEventType.reasoning,
    data: { reasoning },
  } as unknown as ChatEvent);

const createMessageChunkEvent = (text: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { text_chunk: text, message_id: 'message-1' },
  } as ChatEvent);

const createRoundCompleteEvent = (
  message = 'Hello',
  attachments: unknown[] = [],
  steps: unknown[] = []
): ChatEvent =>
  ({
    type: ChatEventType.roundComplete,
    data: {
      round: { id: 'round-1', input: { message: 'hello' }, response: { message }, steps },
      attachments,
    },
  } as unknown as ChatEvent);

const createExecutionStartedEvent = (): ChatEvent =>
  ({
    id: 'round-1::execution_started',
    type: TimelineEventType.executionStarted,
    created_at: '2024-01-01T00:00:00.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'round-1::execution',
    trigger_event_id: 'round-1::user_message',
    data: { trigger_type: 'user_message' },
  } as unknown as ChatEvent);

const createExecutionTerminatedEvent = (
  outcome: unknown = { type: 'responded', response: { message: 'Hello' } }
): ChatEvent =>
  ({
    id: 'round-1::execution_terminated',
    type: TimelineEventType.executionTerminated,
    created_at: '2024-01-01T00:00:00.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'round-1::execution',
    trigger_event_id: 'round-1::user_message',
    data: { outcome },
  } as unknown as ChatEvent);

const createToolCallEvent = (data: Record<string, unknown>): ChatEvent =>
  ({ type: ChatEventType.toolCall, data } as unknown as ChatEvent);

const createToolResultEvent = (toolCallId: string): ChatEvent =>
  ({
    type: ChatEventType.toolResult,
    data: { tool_call_id: toolCallId, tool_id: 'search', results: [] },
  } as unknown as ChatEvent);

/** Stores the attachments of the conversation the callback reads once the stream completes. */
const storeAttachments = (attachments: unknown[]) =>
  conversationClient.get.mockResolvedValue({ id: 'conversation-1', attachments });

const getDeliveredEvents = (service: jest.Mocked<CallbackDeliveryService>) =>
  service.makeCallbackRequest.mock.calls.map(
    ([{ payload }]) => (payload as ChatCallbackEventResponse).event
  );

const createExecutionFailedEvent = (): ChatEvent =>
  ({
    id: 'round-1::execution_failed',
    type: TimelineEventType.executionFailed,
    created_at: '2024-01-01T00:00:01.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'round-1::execution',
    trigger_event_id: 'round-1::user_message',
    data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
  } as unknown as ChatEvent);

const createExecutionAbortedEvent = (): ChatEvent =>
  ({
    id: 'round-1::execution_aborted',
    type: TimelineEventType.executionAborted,
    created_at: '2024-01-01T00:00:01.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'round-1::execution',
    trigger_event_id: 'round-1::user_message',
    data: { time_to_last_token: 1 },
  } as unknown as ChatEvent);

const createCallbackDeliveryServiceMock = () => {
  const service = {
    validateCallbackUrl: jest.fn(),
    makeCallbackRequest: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CallbackDeliveryService>;
  return { service };
};

describe('deliverCallbackEvents', () => {
  beforeEach(() => {
    conversationClient.get.mockReset().mockResolvedValue({ id: 'conversation-1' });
    conversationService.getScopedClientAsUser.mockReset().mockResolvedValue(conversationClient);
  });

  it('resolves without subscribing when no callback is configured', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const subscribed = jest.fn();
    const events$ = defer(() => {
      subscribed();
      return of(createReasoningEvent('hello'));
    });

    await deliverCallbackEvents({
      execution: createConversationExecution(null),
      events$,
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(subscribed).not.toHaveBeenCalled();
    expect(service.makeCallbackRequest).not.toHaveBeenCalled();
  });

  it('resolves without delivering for standalone executions', async () => {
    const { service } = createCallbackDeliveryServiceMock();

    await deliverCallbackEvents({
      execution: createStandaloneExecution(),
      events$: of(createReasoningEvent('hello')),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).not.toHaveBeenCalled();
  });

  it('resolves without subscribing when the callback URL fails validation', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    service.validateCallbackUrl.mockImplementation(() => {
      throw new Error('target url is not added to the Kibana config xpack.actions.allowedHosts');
    });

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(createReasoningEvent('hello')),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).not.toHaveBeenCalled();
  });

  it('delivers one running envelope per event, in order, through a single request function', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const events = [
      createReasoningEvent('one'),
      createReasoningEvent('two'),
      createReasoningEvent('three'),
    ];

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(...events),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(service.validateCallbackUrl).toHaveBeenCalledWith(callbackUrl);
    expect(service.makeCallbackRequest.mock.calls).toEqual(
      events.map((event) => [
        {
          payload: {
            execution_id: 'execution-1',
            event,
          },
          callbackUrl,
          retry: false,
        },
      ])
    );
  });

  it('filters out message_chunk + execution_started events and delivers the rest', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const reasoningEvent = createReasoningEvent('progress');
    const executionStartedEvent = createExecutionStartedEvent();
    const executionTerminatedEvent = createExecutionTerminatedEvent();
    const roundCompleteEvent = createRoundCompleteEvent();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(
        createMessageChunkEvent('chunk one'),
        reasoningEvent,
        createMessageChunkEvent('chunk two'),
        executionStartedEvent,
        executionTerminatedEvent,
        roundCompleteEvent
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const deliveredEvents = service.makeCallbackRequest.mock.calls.map(
      ([{ payload }]) => (payload as { event: ChatEvent }).event
    );

    expect(deliveredEvents).toEqual([
      reasoningEvent,
      { ...executionTerminatedEvent, tool_calls: [] },
      roundCompleteEvent,
    ]);
    expect(deliveredEvents.some((event) => event.type === ChatEventType.messageChunk)).toBe(false);
    expect(deliveredEvents.some((event) => event.type === TimelineEventType.executionStarted)).toBe(
      false
    );
  });

  it('retries only the terminal events; other events are delivered at-most-once', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const progressEvent = createReasoningEvent('progress');
    const executionTerminatedEvent = createExecutionTerminatedEvent();
    const roundCompleteEvent = createRoundCompleteEvent();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(progressEvent, roundCompleteEvent, executionTerminatedEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
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
        payload: {
          execution_id: 'execution-1',
          event: { ...executionTerminatedEvent, tool_calls: [] },
          idempotency_key: 'execution-1',
        },
        retry: true,
      })
    );
    expect(service.makeCallbackRequest).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        payload: {
          execution_id: 'execution-1',
          event: roundCompleteEvent,
          idempotency_key: 'execution-1',
        },
        retry: true,
      })
    );
  });

  it('defers execution_terminated until the stream completes, delivering it before round_complete', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const roundCompleteEvent = createRoundCompleteEvent();
    const executionTerminatedEvent = createExecutionTerminatedEvent();
    const laterEvent = createReasoningEvent('after execution terminated');

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(roundCompleteEvent, executionTerminatedEvent, laterEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const deliveredEvents = service.makeCallbackRequest.mock.calls.map(
      ([{ payload }]) => (payload as { event: ChatEvent }).event
    );

    expect(deliveredEvents).toEqual([
      laterEvent,
      { ...executionTerminatedEvent, tool_calls: [] },
      roundCompleteEvent,
    ]);
  });

  it('defers round_complete until the stream completes, delivering it after later events', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const roundCompleteEvent = createRoundCompleteEvent();
    const laterEvent = createReasoningEvent('after round complete');

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(roundCompleteEvent, laterEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const deliveredEvents = service.makeCallbackRequest.mock.calls.map(
      ([{ payload }]) => (payload as { event: ChatEvent }).event
    );

    expect(deliveredEvents).toEqual([laterEvent, roundCompleteEvent]);
  });

  it('adds the surface payload to both terminal events, rendering it once', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const renderPayload = jest.spyOn(surfacesDeps.surfacesService, 'renderPayload');
    const reasoningEvent = createReasoningEvent('thinking');
    // round_complete is only forwarded: its message is never rendered.
    const roundCompleteEvent = createRoundCompleteEvent('Not rendered');
    const executionTerminatedEvent = createExecutionTerminatedEvent({
      type: 'responded',
      response: { message: 'There are **3** alerts.' },
    });

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(reasoningEvent, roundCompleteEvent, executionTerminatedEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const surfacePayload = {
      text: expect.any(String),
      blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                { type: 'text', text: 'There are ' },
                { type: 'text', text: '3', style: { bold: true } },
                { type: 'text', text: ' alerts.' },
              ],
            },
          ],
        },
      ],
    };

    expect(getDeliveredEvents(service)).toEqual([
      reasoningEvent,
      { ...executionTerminatedEvent, surface_payload: surfacePayload, tool_calls: [] },
      { ...roundCompleteEvent, surface_payload: surfacePayload },
    ]);
    expect(renderPayload).toHaveBeenCalledTimes(1);
    expect(executionTerminatedEvent).not.toHaveProperty('surface_payload');
    expect(roundCompleteEvent).not.toHaveProperty('surface_payload');

    renderPayload.mockRestore();
  });

  it("adds a summary of the stream's tool calls to execution_terminated, without params or results", async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const searchCall = createToolCallEvent({
      tool_call_id: 'tc_1',
      tool_id: 'search',
      intent: 'Searching checkout service logs',
      params: { query: 'service.name:checkout' },
    });

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(
        searchCall,
        createToolResultEvent('tc_1'),
        createToolCallEvent({ tool_call_id: 'tc_2', tool_id: 'execute_api', params: {} }),
        // A repeated tool call is listed once.
        searchCall,
        createRoundCompleteEvent(),
        createExecutionTerminatedEvent()
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const deliveredEvents = getDeliveredEvents(service);
    const terminated = deliveredEvents.find(isExecutionTerminatedEvent) as
      | ChatCallbackExecutionTerminatedEvent
      | undefined;

    expect(terminated?.tool_calls).toEqual([
      { tool_call_id: 'tc_1', tool_id: 'search', intent: 'Searching checkout service logs' },
      { tool_call_id: 'tc_2', tool_id: 'execute_api' },
    ]);
    expect(deliveredEvents.find(isRoundCompleteEvent)).not.toHaveProperty('tool_calls');
  });

  it("renders the stored conversation's attachments as the execution's owner, through their type mapping", async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const textAttachment = {
      id: 'a1',
      type: 'text',
      current_version: 1,
      versions: [
        { version: 1, data: { content: 'Attached note' }, created_at: '', content_hash: '' },
      ],
    };
    getTypeDefinition.mockImplementation((type: string) =>
      type === 'text'
        ? {
            toSurfaceComposition: async ({ data: { content } }: { data: { content: string } }) => ({
              type: 'view',
              body: [{ type: 'markdown', text: content }],
            }),
          }
        : undefined
    );
    storeAttachments([textAttachment]);

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(
        createExecutionTerminatedEvent({
          type: 'responded',
          response: {
            message: 'Note: <render_attachment id="a1" /> Missing: <render_attachment id="a2" />',
          },
        })
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const [terminated] = getDeliveredEvents(service);
    const slack = JSON.stringify(
      (terminated as ChatCallbackExecutionTerminatedEvent).surface_payload
    );

    expect(slack).toContain('Attached note');
    expect(slack).not.toContain('render_attachment');
    expect(conversationService.getScopedClientAsUser).toHaveBeenCalledWith({
      request,
      user: { ...owner, isAdmin: false },
    });
    expect(conversationClient.get).toHaveBeenCalledWith('conversation-1');
  });

  it("renders the surface payload with the execution's agent, request and space", async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const renderPayload = jest.spyOn(surfacesDeps.surfacesService, 'renderPayload');

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(createExecutionTerminatedEvent()),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(renderPayload).toHaveBeenCalledWith(
      { message: 'Hello', attachments: [] },
      {
        originType: ConversationOriginType.Slack,
        agentId: createSlackExecution().agentId,
        request,
        spaceId: 'space-1',
      }
    );

    renderPayload.mockRestore();
  });

  it('renders no surface payload for an execution that asks for user input', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const renderPayload = jest.spyOn(surfacesDeps.surfacesService, 'renderPayload');

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(createExecutionTerminatedEvent({ type: 'prompt_requested', prompts: [] })),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const [terminated] = getDeliveredEvents(service);

    expect(renderPayload).not.toHaveBeenCalled();
    expect(conversationClient.get).not.toHaveBeenCalled();
    expect(terminated).toMatchObject({ surface_payload: undefined, tool_calls: [] });

    renderPayload.mockRestore();
  });

  it('does not add a surface payload to executions without an origin', async () => {
    const { service } = createCallbackDeliveryServiceMock();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(createExecutionTerminatedEvent()),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const [terminated] = getDeliveredEvents(service);

    expect((terminated as ChatCallbackExecutionTerminatedEvent).surface_payload).toBeUndefined();
  });

  it('renders the surface payload without attachments when the conversation is not stored', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const execution = createSlackExecution();
    const renderPayload = jest.spyOn(surfacesDeps.surfacesService, 'renderPayload');

    await deliverCallbackEvents({
      execution: {
        ...execution,
        agentParams: { ...execution.agentParams, storeConversation: false },
      } as AgentExecution,
      events$: of(createExecutionTerminatedEvent()),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(conversationClient.get).not.toHaveBeenCalled();
    expect(renderPayload).toHaveBeenCalledWith(
      { message: 'Hello', attachments: [] },
      expect.anything()
    );

    renderPayload.mockRestore();
  });

  it('delivers both terminal events without a surface payload when the attachments read fails', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const logger = loggerMock.create();
    const roundCompleteEvent = createRoundCompleteEvent();
    const executionTerminatedEvent = createExecutionTerminatedEvent();
    conversationClient.get.mockRejectedValue(new Error('read boom'));

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(roundCompleteEvent, executionTerminatedEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger,
    });

    expect(getDeliveredEvents(service)).toEqual([
      { ...executionTerminatedEvent, tool_calls: [] },
      roundCompleteEvent,
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read the attachments of execution execution-1 for its callback: read boom'
    );
    expect(service.makeCallbackRequest).not.toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ error: expect.anything() }) })
    );
  });

  it('does not deliver the terminal events when the stream errors after them, sending a failure instead', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const roundCompleteEvent = createRoundCompleteEvent();
    const executionTerminatedEvent = createExecutionTerminatedEvent();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: concat(
        of(createReasoningEvent('progress'), roundCompleteEvent, executionTerminatedEvent),
        throwError(() => new Error('persistence boom'))
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const deliveredEvents = service.makeCallbackRequest.mock.calls.map(
      ([{ payload }]) => (payload as { event?: ChatEvent }).event
    );

    expect(deliveredEvents).not.toContain(roundCompleteEvent);
    expect(deliveredEvents).not.toContain(executionTerminatedEvent);
    expect(service.makeCallbackRequest).toHaveBeenLastCalledWith({
      payload: {
        execution_id: 'execution-1',
        error: {
          code: AgentBuilderErrorCode.internalError,
          message: 'persistence boom',
        },
        idempotency_key: 'execution-1',
      },
      callbackUrl,
      retry: true,
    });
  });

  it('does not start the next delivery until the previous one settles', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const calls: string[] = [];
    service.makeCallbackRequest.mockImplementation(async ({ payload }) => {
      const text = (payload as { event: ChatEvent & { data: { reasoning: string } } }).event.data
        .reasoning;
      calls.push(`start:${text}`);
      await new Promise((resolve) => setImmediate(resolve));
      calls.push(`end:${text}`);
    });

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(createReasoningEvent('one'), createReasoningEvent('two')),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(calls).toEqual(['start:one', 'end:one', 'start:two', 'end:two']);
  });

  it('continues with the next event when a delivery fails', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    service.makeCallbackRequest
      .mockRejectedValueOnce(new Error('Callback delivery failed with status 400'))
      .mockResolvedValueOnce(undefined);
    const events = [createReasoningEvent('one'), createReasoningEvent('two')];

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(...events),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).toHaveBeenCalledTimes(2);
  });

  it('delivers a failure payload with a failure error code when the stream errors', async () => {
    const { service } = createCallbackDeliveryServiceMock();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: concat(
        of(createReasoningEvent('one')),
        throwError(() => new Error('agent boom'))
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
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
        idempotency_key: 'execution-1',
      },
      callbackUrl,
      retry: true,
    });
  });

  it('never delivers execution_failed as an event: the failure callback is the single terminal representation', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const reasoning = createReasoningEvent('progress');

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: concat(
        of(reasoning, createExecutionFailedEvent()),
        throwError(() => new Error('agent boom'))
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const payloads = service.makeCallbackRequest.mock.calls.map(([{ payload }]) => payload);
    const delivered = payloads
      .filter((payload) => 'event' in payload)
      .map((payload) => (payload as { event: ChatEvent }).event);
    expect(delivered).toEqual([reasoning]);
    const failures = payloads.filter((payload) => 'error' in payload);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ error: { message: 'agent boom' } });
  });

  it('never delivers execution_aborted as an event: exactly one failure callback with requestAborted', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const reasoning = createReasoningEvent('progress');

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: concat(
        of(reasoning, createExecutionAbortedEvent()),
        throwError(() => createRequestAbortedError('request aborted'))
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const payloads = service.makeCallbackRequest.mock.calls.map(([{ payload }]) => payload);
    const delivered = payloads
      .filter((payload) => 'event' in payload)
      .map((payload) => (payload as { event: ChatEvent }).event);
    expect(delivered).toEqual([reasoning]);
    const failures = payloads.filter((payload) => 'error' in payload);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ error: { code: AgentBuilderErrorCode.requestAborted } });
  });

  it('delivers a failure payload with the requestAborted error code for aborts', async () => {
    const { service } = createCallbackDeliveryServiceMock();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: throwError(() => createRequestAbortedError('request aborted')),
      callbackDeliveryService: service,
      ...surfacesDeps,
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
        idempotency_key: 'execution-1',
      },
      callbackUrl,
      retry: true,
    });
  });

  it('resolves even when the failure delivery fails', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    service.makeCallbackRequest.mockRejectedValue(new Error('callback failed'));

    await expect(
      deliverCallbackEvents({
        execution: createConversationExecution(),
        events$: throwError(() => new Error('agent boom')),
        callbackDeliveryService: service,
        ...surfacesDeps,
        logger: loggerMock.create(),
      })
    ).resolves.toBeUndefined();
  });
});
