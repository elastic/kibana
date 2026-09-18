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
  type PromptResponseEvent,
} from '@kbn/agent-builder-common';
import { ConversationStreamService, type ChatEventSource } from './conversation_stream_service';
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

const SAVED_ANSWER_ID = `${ROUND_ID}::prompt_response::1`;

const promptResponseEvent = (): PromptResponseEvent => ({
  id: SAVED_ANSWER_ID,
  type: TimelineEventType.promptResponse,
  created_at: '2026-01-01T00:00:00.000Z',
  actor: { type: EventActorType.user, id: '' },
  data: {
    prompt_requested_event_id: `${ROUND_ID}::execution_terminated`,
    responses: { 'prompt-1': { allow: true } },
  },
});

const hasTerminal = (events: TimelineDisplayEvent[]): boolean =>
  events.some((event) => event.type === TimelineEventType.executionTerminated);

const messageOf = (events: TimelineDisplayEvent[]): string | undefined => {
  const streaming = events.find(
    (event): event is ExecutionStreamingEvent => event.type === EXECUTION_STREAMING_EVENT_TYPE
  );
  return streaming?.data.message;
};

// Inject a fake source backed by per-conversation Subjects, so the fold can be driven event by
// event without an EventsService.
const makeFakeSource = () => {
  const subjects = new Map<string, Subject<ChatEvent>>();
  const runEndings = new Map<string, Subject<void>>();
  const getSubject = (id: string): Subject<ChatEvent> => {
    if (!subjects.has(id)) subjects.set(id, new Subject());
    return subjects.get(id)!;
  };
  const getStreamEndings = (id: string): Subject<void> => {
    if (!runEndings.has(id)) runEndings.set(id, new Subject());
    return runEndings.get(id)!;
  };
  const source: ChatEventSource = {
    // BrowserChatEvent = ChatEvent, structurally identical
    getChatEvents$: (conversationId) => getSubject(conversationId).asObservable() as any,
    getStreamEnded$: (conversationId) => getStreamEndings(conversationId).asObservable(),
  };
  // What `propagateEvents`' `finalize` does in production: the run terminated, however it ended.
  const endRun = (id: string) => getStreamEndings(id).next();
  return { source, getSubject, endRun };
};

describe('ConversationStreamService', () => {
  it('emits [] immediately on subscribe before any event', () => {
    const { source } = makeFakeSource();
    const service = new ConversationStreamService(source);
    const emissions: TimelineDisplayEvent[][] = [];

    const sub = service.getActiveStream$('A').subscribe((state) => emissions.push(state));
    // BehaviorSubject seed fires synchronously on subscribe
    expect(emissions[0]).toEqual([]);
    sub.unsubscribe();
  });

  it('does not subscribe to the source until the returned observable is subscribed', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Obtained but never subscribed - no source subscription, no map entry to leak
    service.getActiveStream$('A');
    expect(getSubject('A').observed).toBe(false);

    const sub = service.getActiveStream$('A').subscribe(() => {});
    expect(getSubject('A').observed).toBe(true);
    sub.unsubscribe();
  });

  it('emits accumulated states in order as events are pushed', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);
    const emissions: TimelineDisplayEvent[][] = [];

    service.getActiveStream$('A').subscribe((state) => emissions.push(state));

    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('Hello'));
    getSubject('A').next(messageChunkEvent(' World'));

    // [0] = initial seed, [1] = after execution_started, [2] = after 'Hello', [3] = after ' World'
    expect(emissions).toHaveLength(4);
    expect(emissions[0]).toEqual([]);
    expect(messageOf(emissions[2])).toBe('Hello');
    expect(messageOf(emissions[3])).toBe('Hello World');
  });

  it('isolates events per conversation - events for A do not appear on B stream', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);
    const fromA: TimelineDisplayEvent[][] = [];
    const fromB: TimelineDisplayEvent[][] = [];

    service.getActiveStream$('A').subscribe((state) => fromA.push(state));
    service.getActiveStream$('B').subscribe((state) => fromB.push(state));

    getSubject('A').next(executionStartedEvent());
    getSubject('B').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('a1'));
    getSubject('B').next(messageChunkEvent('b1'));

    expect(messageOf(fromA[fromA.length - 1])).toBe('a1');
    expect(messageOf(fromB[fromB.length - 1])).toBe('b1');
    // A stream never saw 'b1'
    expect(fromA.every((state) => messageOf(state) !== 'b1')).toBe(true);
  });

  it('late subscriber immediately receives current folded state (BehaviorSubject replay)', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // First subscriber drives the fold to "Hello"
    service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('Hello'));

    // Late subscriber - gets the current BehaviorSubject value immediately, not initial state
    const lateEmissions: TimelineDisplayEvent[][] = [];
    const lateSub = service.getActiveStream$('A').subscribe((state) => lateEmissions.push(state));

    expect(lateEmissions).toHaveLength(1);
    expect(messageOf(lateEmissions[0])).toBe('Hello');
    lateSub.unsubscribe();
  });

  it('tears down source subscription once the run ends with no subscribers left', () => {
    // maybeTeardown keeps the stream alive while the run is mid-flight.
    // Once the run has ended, it tears down regardless of idle state.
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Subscribe, then push events so live events exist (run in flight)
    const sub = service.getActiveStream$('Z').subscribe(() => {});
    getSubject('Z').next(executionStartedEvent());
    getSubject('Z').next(messageChunkEvent('running'));

    // Unsubscribe - finalize fires maybeTeardown:
    //   observed=false, ended=false, live events exist (not idle) -> keep alive
    sub.unsubscribe();
    expect(getSubject('Z').observed).toBe(true); // source still subscribed

    // The run ends: onStreamEnded drops the live events, then calls maybeTeardown:
    //   observed=false, idle -> teardown
    endRun('Z');
    expect(getSubject('Z').observed).toBe(false); // source subscription torn down
  });

  it('starts fresh live events when a run ends without a terminal event (stop, error, disconnect)', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    // Run 1 streams, then the user hits stop - no terminal event ever arrives
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('abandoned answer'));
    endRun('A');
    expect(state).toEqual([]);

    // Run 2 must not inherit run 1's live events
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('second answer'));

    expect(messageOf(state ?? [])).toBe('second answer');
  });

  it('keeps a second run alive when the consumer leaves mid-stream', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Run 1 finishes
    const sub = service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('first'));
    endRun('A');

    // Run 2 starts, then the user navigates to another conversation
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('second'));
    sub.unsubscribe();

    // Run 2 is still in flight, so the stream must survive and keep folding
    expect(getSubject('A').observed).toBe(true);
    getSubject('A').next(messageChunkEvent(' half'));

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    expect(messageOf(state ?? [])).toBe('second half');
  });

  it('sealed live events (terminal present) survive streamEnded', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(executionTerminatedEvent());
    expect(hasTerminal(state ?? [])).toBe(true);

    endRun('A');
    expect(hasTerminal(state ?? [])).toBe(true);
  });

  it('unsealed live events are still cleared on streamEnded', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('partial'));
    expect(hasTerminal(state ?? [])).toBe(false);

    endRun('A');
    expect(state).toEqual([]);
  });

  it('clears a half-written resume even though the paused execution left a terminal behind', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    // Execution 0 pauses for the human, so its terminal stays in the list.
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(executionTerminatedEvent());
    // The human answers and execution 1 starts streaming.
    getSubject('A').next(resumeStartedEvent());
    getSubject('A').next(messageChunkEvent('half'));
    expect(hasTerminal(state ?? [])).toBe(true);

    // The cursor, not the presence of a terminal, says a run is in flight.
    endRun('A');
    expect(state).toEqual([]);
  });

  it('sealed unobserved stream gets torn down by maybeTeardown', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    const sub = service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(executionTerminatedEvent());
    endRun('A');

    // sealed live events kept, subscriber still active - not torn down yet
    expect(getSubject('A').observed).toBe(true);

    // Unsubscribe - finalize fires maybeTeardown: sealed + unobserved -> teardown allowed
    sub.unsubscribe();
    expect(getSubject('A').observed).toBe(false);
  });

  it('re-subscribe after ended stream creates a fresh stream emitting []', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Create, run, then tear down
    const sub = service.getActiveStream$('X').subscribe(() => {});
    getSubject('X').next(executionStartedEvent());
    getSubject('X').next(messageChunkEvent('data')); // live events exist
    sub.unsubscribe(); // kept alive (not idle, not ended)
    endRun('X'); // tears down, deletes from streams map

    // Re-subscribe: ensure() finds nothing, creates a fresh stream
    const newEmissions: TimelineDisplayEvent[][] = [];
    const newSub = service.getActiveStream$('X').subscribe((state) => newEmissions.push(state));

    // Fresh BehaviorSubject starts with no live events
    expect(newEmissions).toHaveLength(1);
    expect(newEmissions[0]).toEqual([]);
    newSub.unsubscribe();
  });

  it('getSnapshot returns the current live events without subscribing', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    expect(service.getSnapshot('A')).toEqual([]);

    service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('partial'));

    expect(messageOf(service.getSnapshot('A'))).toBe('partial');
  });

  it('clearPersistedExecution drops sealed live events with the matching execution id', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(executionTerminatedEvent());
    endRun('A');
    expect(hasTerminal(state ?? [])).toBe(true);

    service.clearPersistedExecution('A', EXECUTION_ID);

    expect(state).toEqual([]);
  });

  it('clearPersistedExecution ignores a different execution id and a run in flight', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('running'));
    service.clearPersistedExecution('A', 'exec-1');
    expect(messageOf(state ?? [])).toBe('running');

    getSubject('A').next(executionTerminatedEvent('exec-2'));
    service.clearPersistedExecution('A', 'exec-1');
    expect(hasTerminal(state ?? [])).toBe(true);
  });

  it('recordPromptResponse puts the human answer on the timeline right away', () => {
    const { source } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    service.recordPromptResponse('A', promptResponseEvent());

    expect(state).toEqual([promptResponseEvent()]);
  });

  it('recordPromptResponse leaves the streaming run alone', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(messageChunkEvent('running'));

    service.recordPromptResponse('A', promptResponseEvent());

    expect(messageOf(state ?? [])).toBe('running');
    expect(state?.some((event) => event.id === SAVED_ANSWER_ID)).toBe(true);
  });

  it('clearPromptResponse takes the answer back and keeps everything else', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: TimelineDisplayEvent[] | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    getSubject('A').next(executionStartedEvent());
    service.recordPromptResponse('A', promptResponseEvent());

    service.clearPromptResponse('A', SAVED_ANSWER_ID);

    expect(state?.some((event) => event.id === SAVED_ANSWER_ID)).toBe(false);
    expect(state?.some((event) => event.execution_id === EXECUTION_ID)).toBe(true);
  });

  it('clearPromptResponse ignores an id that is not there', () => {
    const { source } = makeFakeSource();
    const service = new ConversationStreamService(source);

    service.getActiveStream$('A').subscribe(() => {});
    service.recordPromptResponse('A', promptResponseEvent());

    service.clearPromptResponse('A', 'never-recorded');

    expect(service.getSnapshot('A')).toEqual([promptResponseEvent()]);
  });

  it('clearPersistedExecution tears the stream down when nobody observes it', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    const sub = service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(executionStartedEvent());
    getSubject('A').next(executionTerminatedEvent());
    endRun('A');
    sub.unsubscribe();
    // A sealed, unobserved stream is already reclaimable; re-observe to keep it, then leave.
    const again = service.getActiveStream$('A').subscribe(() => {});
    again.unsubscribe();

    expect(() => service.clearPersistedExecution('A', EXECUTION_ID)).not.toThrow();
    expect(service.getSnapshot('A')).toEqual([]);
  });
});
