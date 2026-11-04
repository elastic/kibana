/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { BehaviorSubject, defer, finalize, map, tap } from 'rxjs';
import type { ChatEvent, PromptResponseEvent } from '@kbn/agent-builder-common';
import type { LiveEventsState, TimelineDisplayEvent } from './sse_to_events';
import { emptyLiveEventsState, sseToEvents, upsertEvent } from './sse_to_events';

interface ConversationStream {
  conversationId: string;
  state$: BehaviorSubject<LiveEventsState>;
  /** A stream of this view is open for the conversation, so the state is held even unobserved. */
  running: boolean;
}

/**
 * Holds the live events of the runs this copy of the UI streams, one state per conversation. A
 * mutation feeds its stream in through `trackStream`; nothing arrives from other copies of the UI
 * or from the public events broadcast.
 */
export class ConversationStreamService {
  private readonly streams = new Map<string, ConversationStream>();

  dispose(): void {
    this.streams.clear();
  }

  private ensure(conversationId: string): ConversationStream {
    return this.streams.get(conversationId) ?? this.createStream(conversationId);
  }

  private createStream(conversationId: string): ConversationStream {
    const stream: ConversationStream = {
      conversationId,
      state$: new BehaviorSubject<LiveEventsState>(emptyLiveEventsState()),
      running: false,
    };
    this.streams.set(conversationId, stream);
    return stream;
  }

  /**
   * Folds a stream's events into the conversation's live events. The stream is marked running on
   * subscribe, before its first event, so the state survives while nothing observes it; its end -
   * completed, errored or aborted - drops a half-written answer and releases the state once
   * nothing holds it.
   */
  trackStream(conversationId: string): MonoTypeOperatorFunction<ChatEvent> {
    return (source$) =>
      defer(() => {
        const stream = this.ensure(conversationId);
        stream.running = true;

        return source$.pipe(
          tap((event) => {
            stream.state$.next(sseToEvents(stream.state$.getValue(), event));
          }),
          finalize(() => this.onStreamEnded(stream))
        );
      });
  }

  private onStreamEnded(stream: ConversationStream) {
    stream.running = false;
    // A run that never reached its terminal event leaves a half-written answer behind; drop it.
    if (stream.state$.getValue().cursor) {
      stream.state$.next(emptyLiveEventsState());
    }
    this.maybeTeardown(stream.conversationId);
  }

  private maybeTeardown(conversationId: string) {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      return;
    }
    const canReclaim =
      !stream.state$.observed && !stream.state$.getValue().cursor && !stream.running;
    if (!canReclaim) {
      return;
    }
    this.streams.delete(conversationId);
  }

  /**
   * Hot event stream for one conversation. Consumers subscribe (e.g. via `useObservable`) and
   * receive the events the run has produced so far, in the same shape as `conversation.events`.
   */
  getActiveStream$(conversationId: string): Observable<TimelineDisplayEvent[]> {
    return defer(() => this.ensure(conversationId).state$).pipe(
      map((state) => state.events),
      finalize(() => this.maybeTeardown(conversationId))
    );
  }

  /** Non-reactive snapshot: the live events accumulated so far for this conversation. */
  getSnapshot(conversationId: string): TimelineDisplayEvent[] {
    return this.streams.get(conversationId)?.state$.getValue().events ?? [];
  }

  /**
   * Optimistically inserts a `prompt_response` event into the live stream so the timeline
   * immediately reflects the human's answer before the server persists it.
   */
  recordPromptResponse(conversationId: string, event: PromptResponseEvent): void {
    const stream = this.ensure(conversationId);
    const current = stream.state$.getValue();
    stream.state$.next({ ...current, events: upsertEvent(current.events, event) });
  }

  /**
   * Removes a previously optimistic `prompt_response` event (rollback on request failure).
   * No-op when the stream or the event is gone.
   */
  clearPromptResponse(conversationId: string, eventId: string): void {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      return;
    }
    const current = stream.state$.getValue();
    const next = current.events.filter((e) => e.id !== eventId);
    if (next.length !== current.events.length) {
      stream.state$.next({ ...current, events: next });
    }
  }

  /**
   * Drops the live events of an execution once its saved twin is in the cache. Id-matching already
   * makes the saved events win, so this only frees memory.
   */
  clearPersistedExecution(conversationId: string, executionId: string) {
    const stream = this.streams.get(conversationId);
    const current = stream?.state$.getValue();
    if (!stream || !current || current.cursor) {
      return;
    }
    const nextEvents = current.events.filter((event) => event.execution_id !== executionId);
    if (nextEvents.length === current.events.length) {
      return;
    }
    stream.state$.next({ ...current, events: nextEvents });
    this.maybeTeardown(conversationId);
  }
}
