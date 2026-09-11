/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import { ConversationStreamService, type ChatEventSource } from './conversation_stream_service';
import type { ActiveExecutionDraft } from './active_execution_reducer';

// Minimal message_chunk event - enough for the reducer to accumulate message text
const messageChunkEvent = (chunk: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk: chunk },
  } as ChatEvent);

// Inject a fake source backed by per-conversation Subjects, so the fold can be driven event by
// event without an EventsService.
const makeFakeSource = () => {
  const subjects = new Map<string, Subject<ChatEvent>>();
  const runEndings = new Map<string, Subject<void>>();
  const getSubject = (id: string): Subject<ChatEvent> => {
    if (!subjects.has(id)) subjects.set(id, new Subject());
    return subjects.get(id)!;
  };
  const getRunEndings = (id: string): Subject<void> => {
    if (!runEndings.has(id)) runEndings.set(id, new Subject());
    return runEndings.get(id)!;
  };
  const source: ChatEventSource = {
    // BrowserChatEvent = ChatEvent, structurally identical
    getChatEvents$: (conversationId) => getSubject(conversationId).asObservable() as any,
    getRunEnded$: (conversationId) => getRunEndings(conversationId).asObservable(),
  };
  // What `propagateEvents`' `finalize` does in production: the run terminated, however it ended.
  const endRun = (id: string) => getRunEndings(id).next();
  return { source, getSubject, endRun };
};

describe('ConversationStreamService', () => {
  it('emits null immediately on subscribe before any event', () => {
    const { source } = makeFakeSource();
    const service = new ConversationStreamService(source);
    const emissions: Array<ActiveExecutionDraft | null> = [];

    const sub = service.getActiveStream$('A').subscribe((state) => emissions.push(state));
    // BehaviorSubject seed fires synchronously on subscribe
    expect(emissions[0]).toBeNull();
    sub.unsubscribe();
  });

  it('does not subscribe to the source until the returned observable is subscribed', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Obtained but never subscribed - no source subscription, no map entry to leak
    service.getActiveStream$('A');
    expect(getSubject('A').observed).toBe(false);
    expect(service.isStreamActive('A')).toBe(false);

    const sub = service.getActiveStream$('A').subscribe(() => {});
    expect(getSubject('A').observed).toBe(true);
    sub.unsubscribe();
  });

  it('emits accumulated states in order as events are pushed', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);
    const emissions: Array<ActiveExecutionDraft | null> = [];

    service.getActiveStream$('A').subscribe((state) => emissions.push(state));

    getSubject('A').next(messageChunkEvent('Hello'));
    getSubject('A').next(messageChunkEvent(' World'));

    // [0] = initial seed, [1] = after 'Hello', [2] = after ' World'
    expect(emissions).toHaveLength(3);
    expect(emissions[0]).toBeNull();
    expect(emissions[1]?.message).toBe('Hello');
    expect(emissions[2]?.message).toBe('Hello World');
  });

  it('isolates events per conversation - events for A do not appear on B stream', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);
    const fromA: Array<ActiveExecutionDraft | null> = [];
    const fromB: Array<ActiveExecutionDraft | null> = [];

    service.getActiveStream$('A').subscribe((state) => fromA.push(state));
    service.getActiveStream$('B').subscribe((state) => fromB.push(state));

    getSubject('A').next(messageChunkEvent('a1'));
    getSubject('B').next(messageChunkEvent('b1'));

    expect(fromA[1]?.message).toBe('a1');
    expect(fromB[1]?.message).toBe('b1');
    // A stream never saw 'b1'
    expect(fromA.every((s) => s?.message !== 'b1')).toBe(true);
  });

  it('late subscriber immediately receives current folded state (BehaviorSubject replay)', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // First subscriber drives the fold to "Hello"
    service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(messageChunkEvent('Hello'));

    // Late subscriber - gets the current BehaviorSubject value immediately, not initial state
    const lateEmissions: Array<ActiveExecutionDraft | null> = [];
    const lateSub = service.getActiveStream$('A').subscribe((state) => lateEmissions.push(state));

    expect(lateEmissions).toHaveLength(1);
    expect(lateEmissions[0]?.message).toBe('Hello');
    lateSub.unsubscribe();
  });

  it('isStreamActive is false initially, true during active execution, false once the run ends', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // No stream yet - false
    expect(service.isStreamActive('A')).toBe(false);

    service.getActiveStream$('A').subscribe(() => {});
    // Stream exists but there is no draft yet - still false
    expect(service.isStreamActive('A')).toBe(false);

    getSubject('A').next(messageChunkEvent('text'));
    expect(service.isStreamActive('A')).toBe(true);

    endRun('A');
    expect(service.isStreamActive('A')).toBe(false);
  });

  it('tears down source subscription once the run ends with no subscribers left', () => {
    // maybeTeardown keeps the stream alive while the run is mid-flight.
    // Once the run has ended, it tears down regardless of idle state.
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Subscribe, then push an event so a draft exists (run in flight)
    const sub = service.getActiveStream$('Z').subscribe(() => {});
    getSubject('Z').next(messageChunkEvent('running'));

    // Unsubscribe - finalize fires maybeTeardown:
    //   observed=false, ended=false, a draft exists (not idle) -> keep alive
    sub.unsubscribe();
    expect(getSubject('Z').observed).toBe(true); // source still subscribed

    // The run ends: onRunEnded drops the draft, sets ended=true, then calls maybeTeardown:
    //   observed=false, ended=true -> teardown
    endRun('Z');
    expect(getSubject('Z').observed).toBe(false); // source subscription torn down
  });

  it('starts a fresh draft when a run ends without a terminal event (stop, error, disconnect)', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    let state: ActiveExecutionDraft | null | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));

    // Run 1 streams, then the user hits stop - no terminal event ever arrives
    getSubject('A').next(messageChunkEvent('abandoned answer'));
    endRun('A');
    expect(state).toBeNull();

    // Run 2 must not inherit run 1's draft
    getSubject('A').next(messageChunkEvent('second answer'));

    expect(state?.message).toBe('second answer');
  });

  it('keeps a second run alive when the consumer leaves mid-stream', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Run 1 finishes
    const sub = service.getActiveStream$('A').subscribe(() => {});
    getSubject('A').next(messageChunkEvent('first'));
    endRun('A');

    // Run 2 starts, then the user navigates to another conversation
    getSubject('A').next(messageChunkEvent('second'));
    sub.unsubscribe();

    // Run 2 is still in flight, so the stream must survive and keep folding
    expect(getSubject('A').observed).toBe(true);
    getSubject('A').next(messageChunkEvent(' half'));

    let state: ActiveExecutionDraft | null | undefined;
    service.getActiveStream$('A').subscribe((next) => (state = next));
    expect(state?.message).toBe('second half');
  });

  it('releaseStream keeps a stream whose run is still in flight', () => {
    const { source, getSubject } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Consumer gone, but the agent is still answering - the rest of the run must still be folded
    const sub = service.getActiveStream$('R').subscribe(() => {});
    getSubject('R').next(messageChunkEvent('answer'));
    sub.unsubscribe();

    service.releaseStream('R');

    expect(getSubject('R').observed).toBe(true);
  });

  it('releaseStream keeps a stream that a consumer is still subscribed to', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    const sub = service.getActiveStream$('R').subscribe(() => {});
    getSubject('R').next(messageChunkEvent('answer'));
    endRun('R');

    service.releaseStream('R');

    expect(getSubject('R').observed).toBe(true);
    sub.unsubscribe();
  });

  it('releaseStream on an unknown conversation is a no-op', () => {
    const { source } = makeFakeSource();
    const service = new ConversationStreamService(source);

    expect(() => service.releaseStream('nope')).not.toThrow();
  });

  it('re-subscribe after ended stream creates a fresh stream emitting null', () => {
    const { source, getSubject, endRun } = makeFakeSource();
    const service = new ConversationStreamService(source);

    // Create, run, then tear down
    const sub = service.getActiveStream$('X').subscribe(() => {});
    getSubject('X').next(messageChunkEvent('data')); // draft exists
    sub.unsubscribe(); // kept alive (not idle, not ended)
    endRun('X'); // tears down, deletes from streams map

    // Re-subscribe: ensure() finds nothing, creates a fresh stream
    const newEmissions: Array<ActiveExecutionDraft | null> = [];
    const newSub = service.getActiveStream$('X').subscribe((state) => newEmissions.push(state));

    // Fresh BehaviorSubject starts with no draft
    expect(newEmissions).toHaveLength(1);
    expect(newEmissions[0]).toBeNull();
    newSub.unsubscribe();
  });
});
