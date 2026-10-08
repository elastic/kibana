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
  ConversationOriginType,
  createRequestAbortedError,
  TimelineEventType,
  type ChatEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { AttachmentServiceStart } from '../../attachments';
import { SurfacesServiceImpl } from '../../surfaces';
import type { CallbackDeliveryService } from './callback_delivery_service';
import { deliverCallbackEvents } from './deliver_callback_events';

const callbackUrl = 'https://callback.example.com/v1/events?token=abc';
const getTypeDefinition = jest.fn();
const surfacesDeps = {
  surfacesService: new SurfacesServiceImpl({
    attachmentsService: { getTypeDefinition } as unknown as AttachmentServiceStart,
    logger: loggerMock.create(),
  }),
};
const createConversationExecution = (url: string | null = callbackUrl): AgentExecution =>
  ({
    executionId: 'execution-1',
    executionMode: AgentExecutionMode.conversation,
    agentParams: {
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

const createRoundCompleteEvent = (message = 'Hello', attachments: unknown[] = []): ChatEvent =>
  ({
    type: ChatEventType.roundComplete,
    data: {
      round: { id: 'round-1', input: { message: 'hello' }, response: { message } },
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

const createExecutionTerminatedEvent = (): ChatEvent =>
  ({
    id: 'round-1::execution_terminated',
    type: TimelineEventType.executionTerminated,
    created_at: '2024-01-01T00:00:00.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'round-1::execution',
    trigger_event_id: 'round-1::user_message',
    data: {},
  } as unknown as ChatEvent);

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
  const transport = jest.fn().mockResolvedValue({ status: 200 });
  const service = {
    validateCallbackUrl: jest.fn(),
    createTransport: jest.fn().mockReturnValue(transport),
    makeCallbackRequest: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CallbackDeliveryService>;
  return { service, transport };
};

describe('deliverCallbackEvents', () => {
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
    const { service, transport } = createCallbackDeliveryServiceMock();
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
    expect(service.createTransport).toHaveBeenCalledTimes(1);
    expect(service.createTransport).toHaveBeenCalledWith(callbackUrl);
    expect(service.makeCallbackRequest.mock.calls).toEqual(
      events.map((event) => [
        {
          payload: {
            execution_id: 'execution-1',
            event,
          },
          transport,
          retry: false,
        },
      ])
    );
  });

  it('filters out message_chunk + execution_started + execution_terminated events and delivers the rest', async () => {
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

    expect(deliveredEvents).toEqual([reasoningEvent, roundCompleteEvent]);
    expect(deliveredEvents.some((event) => event.type === ChatEventType.messageChunk)).toBe(false);
    expect(deliveredEvents.some((event) => event.type === TimelineEventType.executionStarted)).toBe(
      false
    );
    expect(
      deliveredEvents.some((event) => event.type === TimelineEventType.executionTerminated)
    ).toBe(false);
  });

  it('retries only round_complete events; other events are delivered at-most-once', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const progressEvent = createReasoningEvent('progress');
    const roundCompleteEvent = createRoundCompleteEvent();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(progressEvent, roundCompleteEvent),
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
          event: roundCompleteEvent,
          idempotency_key: 'execution-1',
        },
        retry: true,
      })
    );
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

  it('adds the Slack surface payload to round_complete for Slack rounds', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const reasoningEvent = createReasoningEvent('thinking');
    const roundCompleteEvent = createRoundCompleteEvent('There are **3** alerts.');

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(reasoningEvent, roundCompleteEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const deliveredEvents = service.makeCallbackRequest.mock.calls.map(
      ([{ payload }]) => (payload as { event: ChatEvent }).event
    );

    expect(deliveredEvents).toEqual([
      reasoningEvent,
      {
        ...roundCompleteEvent,
        surface_payload: {
          text: expect.any(String),
          blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'There are *3* alerts.' } }],
        },
      },
    ]);
    expect(roundCompleteEvent).not.toHaveProperty('surface_payload');
  });

  it('renders attachments through their type mapping, and leaves out the others', async () => {
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
            toIsomerComposition: ({ content }: { content: string }) => ({
              type: 'view',
              body: [{ type: 'markdown', text: content }],
            }),
          }
        : undefined
    );

    await deliverCallbackEvents({
      execution: createSlackExecution(),
      events$: of(
        createRoundCompleteEvent(
          'Note: <render_attachment id="a1" /> Missing: <render_attachment id="a2" />',
          [textAttachment]
        )
      ),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    const [[{ payload }]] = service.makeCallbackRequest.mock.calls;
    const slack = JSON.stringify((payload as { event: RoundCompleteEvent }).event.surface_payload);

    expect(slack).toContain('Attached note');
    expect(slack).not.toContain('render_attachment');
  });

  it('does not add a surface payload to rounds without an origin', async () => {
    const { service } = createCallbackDeliveryServiceMock();
    const roundCompleteEvent = createRoundCompleteEvent();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: of(roundCompleteEvent),
      callbackDeliveryService: service,
      ...surfacesDeps,
      logger: loggerMock.create(),
    });

    expect(service.makeCallbackRequest).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ event: roundCompleteEvent }) })
    );
  });

  it('does not deliver round_complete when the stream errors after it, sending a failure instead', async () => {
    const { service, transport } = createCallbackDeliveryServiceMock();
    const roundCompleteEvent = createRoundCompleteEvent();

    await deliverCallbackEvents({
      execution: createConversationExecution(),
      events$: concat(
        of(createReasoningEvent('progress'), roundCompleteEvent),
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
    expect(service.makeCallbackRequest).toHaveBeenLastCalledWith({
      payload: {
        execution_id: 'execution-1',
        error: {
          code: AgentBuilderErrorCode.internalError,
          message: 'persistence boom',
        },
        idempotency_key: 'execution-1',
      },
      transport,
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
    const { service, transport } = createCallbackDeliveryServiceMock();

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
      transport,
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
    const { service, transport } = createCallbackDeliveryServiceMock();

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
      transport,
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
