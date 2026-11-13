/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import {
  ChatEventType,
  TimelineEventType,
  EventActorType,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import { ConversationStreamService } from './conversation_stream_service';
import {
  EXECUTION_STREAMING_EVENT_TYPE,
  type ExecutionStreamingEvent,
  type TimelineDisplayEvent,
} from './sse_to_events';

const ROUND_ID = 'round-1';
const TRIGGER_EVENT_ID = `${ROUND_ID}::user_message`;
const EXECUTION_ID = `${ROUND_ID}::execution`;

// A real run always sends `execution_started` before any content - this is what teaches the
// reducer the execution/trigger ids it stamps onto every event it synthesizes.
const executionStartedEvent = (): ChatEvent =>
  ({
    type: TimelineEventType.executionStarted,
    id: `${ROUND_ID}::execution_started`,
    created_at: new Date().toISOString(),
    actor: { type: EventActorType.agent, id: 'agent' },
    execution_id: EXECUTION_ID,
    trigger_event_id: TRIGGER_EVENT_ID,
    data: { trigger_type: 'user_message' },
  } as ChatEvent);

const messageChunkEvent = (chunk: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk: chunk },
  } as ChatEvent);

const RESUME_EXECUTION_ID = `${ROUND_ID}::execution::1`;

// A HITL resume: a second execution on the same round, triggered by the human's answer.
const resumeStartedEvent = (): ChatEvent =>
  ({
    type: TimelineEventType.executionStarted,
    id: `${RESUME_EXECUTION_ID}::execution_started`,
    created_at: new Date().toISOString(),
    actor: { type: EventActorType.agent, id: 'agent' },
    execution_id: RESUME_EXECUTION_ID,
    trigger_event_id: `${ROUND_ID}::prompt_response::1`,
    data: { trigger_type: 'prompt_response' },
  } as ChatEvent);

const executionTerminatedEvent = (executionId = EXECUTION_ID): ChatEvent =>
  ({
    type: TimelineEventType.executionTerminated,
    id: `${ROUND_ID}::execution_terminated`,
    created_at: new Date().toISOString(),
    actor: { type: EventActorType.agent, id: 'agent' },
    execution_id: executionId,
    trigger_event_id: TRIGGER_EVENT_ID,
    data: {
      model_usage: {
        connector_id: '',
        llm_calls: 1,
        input_tokens: 10,
        output_tokens: 5,
        model: 'test',
      },
      time_to_first_token: 100,
      time_to_last_token: 200,
      outcome: { type: 'responded', response: { message: 'done' } },
    },
  } as ChatEvent);

const hasTerminal = (events: TimelineDisplayEvent[]): boolean =>
  events.some((event) => event.type === TimelineEventType.executionTerminated);

const messageOf = (events: TimelineDisplayEvent[]): string | undefined => {
  const streaming = events.find(
    (event): event is ExecutionStreamingEvent => event.type === EXECUTION_STREAMING_EVENT_TYPE
  );
  return streaming?.data.message;
};

/**
 * Drives the reducer the way a mutation does: a stream (a Subject here) piped through `trackStream`.
 * `start` subscribes, which marks the run as running; `end` completes the stream, which is what
 * a completed, errored or aborted connection does through `finalize`.
 */
const makeRun = (service: ConversationStreamService, conversationId: string) => {
  const stream$ = new Subject<ChatEvent>();
  return {
    start: () => stream$.pipe(service.trackStream(conversationId)).subscribe(),
    push: (event: ChatEvent) => stream$.next(event),
    end: () => stream$.complete(),
  };
};

describe('ConversationStreamService', () => {
  it('emits [] immediately on subscribe before any event', () => {
    const service = new ConversationStreamService();
    const emissions: TimelineDisplayEvent[][] = [];

    const sub = service.getActiveStream$('A').subscribe((state) => emissions.push(state));
    // BehaviorSubject seed fires synchronously on subscribe
    expect(emissions[0]).toEqual([]);
    sub.unsubscribe();
  });

  it('trackStream does not touch the stream until it is subscribed', () => {
    const service = new ConversationStreamService();
    const stream$ = new Subject<ChatEvent>();

    // Obtained but never subscribed - nothing is reduced and nothing is retained.
    const tracked$ = stream$.pipe(service.trackStream('A'));
    stream$.next(executionStartedEvent());
    stream$.next(messageChunkEvent('missed'));
    expect(service.getSnapshot('A')).toEqual([]);

    tracked$.subscribe();
    stream$.next(executionStartedEvent());
    stream$.next(messageChunkEvent('seen'));
    expect(messageOf(service.getSnapshot('A'))).toBe('seen');
  });

  it('emits accumulated states in order as events are pushed', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');
    const emissions: TimelineDisplayEvent[][] = [];

    service.getActiveStream$('A').subscribe((state) => emissions.push(state));

    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('Hello'));
    run.push(messageChunkEvent(' World'));

    // [0] = initial seed, [1] = after execution_started, [2] = after 'Hello', [3] = after ' World'
    expect(emissions).toHaveLength(4);
    expect(emissions[0]).toEqual([]);
    expect(messageOf(emissions[2])).toBe('Hello');
    expect(messageOf(emissions[3])).toBe('Hello World');
  });

  it('isolates events per conversation - events for A do not appear on B stream', () => {
    const service = new ConversationStreamService();
    const runA = makeRun(service, 'A');
    const runB = makeRun(service, 'B');
    const fromA: TimelineDisplayEvent[][] = [];
    const fromB: TimelineDisplayEvent[][] = [];

    service.getActiveStream$('A').subscribe((state) => fromA.push(state));
    service.getActiveStream$('B').subscribe((state) => fromB.push(state));

    runA.start();
    runB.start();
    runA.push(executionStartedEvent());
    runB.push(executionStartedEvent());
    runA.push(messageChunkEvent('a1'));
    runB.push(messageChunkEvent('b1'));

    expect(messageOf(fromA[fromA.length - 1])).toBe('a1');
    expect(messageOf(fromB[fromB.length - 1])).toBe('b1');
    // A stream never saw 'b1'
    expect(fromA.every((state) => messageOf(state) !== 'b1')).toBe(true);
  });

  it('a second stream for the same conversation is added to the same state', () => {
    // Two connections to one run in one view never happen, but the reducer does not care which
    // connection an event came from: it is one state per conversation.
    const service = new ConversationStreamService();
    const first = makeRun(service, 'A');
    const second = makeRun(service, 'A');

    first.start();
    first.push(executionStartedEvent());
    first.push(messageChunkEvent('one'));
    second.start();
    second.push(messageChunkEvent(' two'));

    expect(messageOf(service.getSnapshot('A'))).toBe('one two');
  });

  it('late subscriber immediately receives the current state (BehaviorSubject replay)', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    // First subscriber drives the state to "Hello"
    service.getActiveStream$('A').subscribe(() => {});
    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('Hello'));

    // Late subscriber - gets the current BehaviorSubject value immediately, not initial state
    const lateEmissions: TimelineDisplayEvent[][] = [];
    const lateSub = service.getActiveStream$('A').subscribe((state) => lateEmissions.push(state));

    expect(lateEmissions).toHaveLength(1);
    expect(messageOf(lateEmissions[0])).toBe('Hello');
    lateSub.unsubscribe();
  });

  it('keeps updating from a run in flight after the consumer leaves, so a new consumer catches up', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    const sub = service.getActiveStream$('A').subscribe(() => {});
    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('first'));
    sub.unsubscribe();

    // Still in flight: the state is held and keeps updating.
    run.push(messageChunkEvent(' half'));

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    expect(messageOf(state ?? [])).toBe('first half');
  });

  it('starts fresh live events when a run ends without a terminal event (stop, error, disconnect)', () => {
    const service = new ConversationStreamService();

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    // Run 1 streams, then the user hits stop - no terminal event ever arrives
    const first = makeRun(service, 'A');
    first.start();
    first.push(executionStartedEvent());
    first.push(messageChunkEvent('abandoned answer'));
    first.end();
    expect(state).toEqual([]);

    // Run 2 must not inherit run 1's live events
    const second = makeRun(service, 'A');
    second.start();
    second.push(executionStartedEvent());
    second.push(messageChunkEvent('second answer'));

    expect(messageOf(state ?? [])).toBe('second answer');
  });

  it('keeps a second run alive when the consumer leaves mid-stream', () => {
    const service = new ConversationStreamService();

    // Run 1 finishes
    const sub = service.getActiveStream$('A').subscribe(() => {});
    const first = makeRun(service, 'A');
    first.start();
    first.push(executionStartedEvent());
    first.push(messageChunkEvent('first'));
    first.end();

    // Run 2 starts, then the user navigates to another conversation
    const second = makeRun(service, 'A');
    second.start();
    second.push(executionStartedEvent());
    second.push(messageChunkEvent('second'));
    sub.unsubscribe();

    // Run 2 is still in flight, so the state must survive and keep updating
    second.push(messageChunkEvent(' half'));

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    expect(messageOf(state ?? [])).toBe('second half');
  });

  it('a running stream holds state recorded before its cursor, even with no subscriber', () => {
    // The gap this closes: the resume mutation records its optimistic answer before the stream
    // subscribes, and the consumer may leave before `execution_started` sets the cursor. Only
    // `running` keeps that state from being reclaimed.
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');
    const promptResponse = {
      id: 'pr-1',
      type: TimelineEventType.promptResponse,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.user, id: 'user' },
      data: { prompt_requested_event_id: 'pause-1', responses: {} },
    } as TimelineDisplayEvent;

    service.recordPromptResponse('A', promptResponse as any);
    run.start();
    const sub = service.getActiveStream$('A').subscribe(() => {});
    sub.unsubscribe();

    expect(service.getSnapshot('A').find((e) => e.id === 'pr-1')).toBeDefined();
  });

  it('releases a run that ends with nothing to keep', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');
    const promptResponse = {
      id: 'pr-1',
      type: TimelineEventType.promptResponse,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.user, id: 'user' },
      data: { prompt_requested_event_id: 'pause-1', responses: {} },
    } as TimelineDisplayEvent;

    run.start();
    run.push(executionStartedEvent());
    service.recordPromptResponse('A', promptResponse as any);
    expect(service.getSnapshot('A')).not.toEqual([]);

    // No subscriber and the run ends without a terminal: the half-written state is dropped and
    // nothing holds the stream any more.
    run.end();
    expect(service.getSnapshot('A')).toEqual([]);
  });

  it('sealed live events (terminal present) survive the end of the stream', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    run.start();
    run.push(executionStartedEvent());
    run.push(executionTerminatedEvent());
    expect(hasTerminal(state ?? [])).toBe(true);

    run.end();
    expect(hasTerminal(state ?? [])).toBe(true);
  });

  it('a failed terminal seals the live events too', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    run.start();
    run.push(executionStartedEvent());
    run.push({
      type: TimelineEventType.executionFailed,
      id: `${ROUND_ID}::execution_failed`,
      created_at: '2026-01-01T00:00:09.000Z',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: EXECUTION_ID,
      trigger_event_id: TRIGGER_EVENT_ID,
      data: { error: { code: 'internalError', message: 'boom' }, time_to_last_token: 20 },
    } as ChatEvent);

    run.end();
    expect(state?.some((event) => event.type === TimelineEventType.executionFailed)).toBe(true);
  });

  it('unsealed live events are still cleared when the stream ends', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('partial'));
    expect(hasTerminal(state ?? [])).toBe(false);

    run.end();
    expect(state).toEqual([]);
  });

  it('a stream that errors ends the same way as one that completes', () => {
    const service = new ConversationStreamService();
    const stream$ = new Subject<ChatEvent>();

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    stream$.pipe(service.trackStream('A')).subscribe({ error: () => {} });
    stream$.next(executionStartedEvent());
    stream$.next(messageChunkEvent('partial'));
    stream$.error(new Error('boom'));

    expect(state).toEqual([]);
  });

  it('clears a half-written resume even though the paused execution left a terminal behind', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    run.start();
    // Execution 0 pauses for the human, so its terminal stays in the list.
    run.push(executionStartedEvent());
    run.push(executionTerminatedEvent());
    // The human answers and execution 1 starts streaming.
    run.push(resumeStartedEvent());
    run.push(messageChunkEvent('half'));
    expect(hasTerminal(state ?? [])).toBe(true);

    // The cursor, not the presence of a terminal, says a run is in flight.
    run.end();
    expect(state).toEqual([]);
  });

  it('re-subscribe after an ended run creates a fresh stream emitting []', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'X');

    // Create, run, then let it end with no subscriber
    const sub = service.getActiveStream$('X').subscribe(() => {});
    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('data')); // live events exist
    sub.unsubscribe(); // kept alive (not idle, not ended)
    run.end(); // nothing holds it any more

    // Re-subscribe: a fresh state with no live events
    const newEmissions: TimelineDisplayEvent[][] = [];
    const newSub = service.getActiveStream$('X').subscribe((state) => newEmissions.push(state));

    expect(newEmissions).toHaveLength(1);
    expect(newEmissions[0]).toEqual([]);
    newSub.unsubscribe();
  });

  it('getSnapshot returns the current live events without subscribing', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    expect(service.getSnapshot('A')).toEqual([]);

    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('partial'));

    expect(messageOf(service.getSnapshot('A'))).toBe('partial');
  });

  it('clearPersistedExecution drops sealed live events with the matching execution id', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    run.start();
    run.push(executionStartedEvent());
    run.push(executionTerminatedEvent());
    run.end();
    expect(hasTerminal(state ?? [])).toBe(true);

    service.clearPersistedExecution('A', EXECUTION_ID);

    expect(state).toEqual([]);
  });

  it('clearPersistedExecution ignores a different execution id and a run in flight', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('running'));
    service.clearPersistedExecution('A', 'exec-1');
    expect(messageOf(state ?? [])).toBe('running');

    run.push(executionTerminatedEvent('exec-2'));
    service.clearPersistedExecution('A', 'exec-1');
    expect(hasTerminal(state ?? [])).toBe(true);
  });

  it('clearPersistedExecution tears the stream down when nobody observes it', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    const sub = service.getActiveStream$('A').subscribe(() => {});
    run.start();
    run.push(executionStartedEvent());
    run.push(executionTerminatedEvent());
    run.end();
    sub.unsubscribe();
    // A sealed, unobserved stream is already reclaimable; re-observe to keep it, then leave.
    const again = service.getActiveStream$('A').subscribe(() => {});
    again.unsubscribe();

    expect(() => service.clearPersistedExecution('A', EXECUTION_ID)).not.toThrow();
    expect(service.getSnapshot('A')).toEqual([]);
  });

  it('recordPromptResponse inserts the event into the live stream immediately', () => {
    const service = new ConversationStreamService();
    const emissions: TimelineDisplayEvent[][] = [];

    service.getActiveStream$('A').subscribe((state) => emissions.push(state));

    const promptResponse = {
      id: 'pr-1',
      type: TimelineEventType.promptResponse,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'system' },
      data: { prompt_requested_event_id: 'pause-1', responses: {} },
    } as TimelineDisplayEvent;

    service.recordPromptResponse('A', promptResponse as any);

    const last = emissions[emissions.length - 1];
    expect(last.find((e) => e.id === 'pr-1')).toBeDefined();
  });

  it('recordPromptResponse creates the stream when none exists', () => {
    const service = new ConversationStreamService();

    const promptResponse = {
      id: 'pr-1',
      type: TimelineEventType.promptResponse,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'system' },
      data: { prompt_requested_event_id: 'pause-1', responses: {} },
    } as TimelineDisplayEvent;

    expect(() => service.recordPromptResponse('A', promptResponse as any)).not.toThrow();
    expect(service.getSnapshot('A').find((e) => e.id === 'pr-1')).toBeDefined();
  });

  it('clearPromptResponse removes the event by id', () => {
    const service = new ConversationStreamService();
    const emissions: TimelineDisplayEvent[][] = [];

    service.getActiveStream$('A').subscribe((state) => emissions.push(state));

    const promptResponse = {
      id: 'pr-1',
      type: TimelineEventType.promptResponse,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'system' },
      data: { prompt_requested_event_id: 'pause-1', responses: {} },
    } as TimelineDisplayEvent;

    service.recordPromptResponse('A', promptResponse as any);
    service.clearPromptResponse('A', 'pr-1');

    const last = emissions[emissions.length - 1];
    expect(last.find((e) => e.id === 'pr-1')).toBeUndefined();
  });

  it('clearPromptResponse is a no-op when the stream does not exist', () => {
    const service = new ConversationStreamService();

    expect(() => service.clearPromptResponse('A', 'pr-1')).not.toThrow();
  });

  it('clearPromptResponse is a no-op when the event is not in the stream', () => {
    const service = new ConversationStreamService();
    service.getActiveStream$('A').subscribe(() => {});

    expect(() => service.clearPromptResponse('A', 'pr-999')).not.toThrow();
  });

  it('dispose drops every held stream', () => {
    const service = new ConversationStreamService();
    const run = makeRun(service, 'A');

    run.start();
    run.push(executionStartedEvent());
    run.push(messageChunkEvent('partial'));
    expect(messageOf(service.getSnapshot('A'))).toBe('partial');

    service.dispose();

    expect(service.getSnapshot('A')).toEqual([]);
  });
});
