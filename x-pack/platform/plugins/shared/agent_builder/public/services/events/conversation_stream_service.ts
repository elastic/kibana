/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, defer, finalize, map } from 'rxjs';
import type { PromptResponseEvent } from '@kbn/agent-builder-common';
import type { LiveEventsState, TimelineDisplayEvent } from './sse_to_events';
import { emptyLiveEventsState, sseToEvents, upsertEvent } from './sse_to_events';
import type { EventsService } from './events_service';

export type ChatEventSource = Pick<EventsService, 'getChatEvents$' | 'getStreamEnded$'>;

interface ConversationStream {
  conversationId: string;
  state$: BehaviorSubject<LiveEventsState>;
  sub: Subscription;
}

export class ConversationStreamService {
  private readonly streams = new Map<string, ConversationStream>();

  constructor(private readonly source: ChatEventSource) {}

  private ensure(conversationId: string): ConversationStream {
    return this.streams.get(conversationId) ?? this.createStream(conversationId);
  }

  private createStream(conversationId: string): ConversationStream {
    const state$ = new BehaviorSubject<LiveEventsState>(emptyLiveEventsState());
    const sub = this.source
      .getChatEvents$(conversationId)
      .subscribe((event) => state$.next(sseToEvents(state$.getValue(), event)));
    const stream: ConversationStream = { conversationId, state$, sub };
    this.streams.set(conversationId, stream);

    sub.add(
      this.source.getStreamEnded$(conversationId).subscribe(() => this.onStreamEnded(stream))
    );
    return stream;
  }

  private onStreamEnded({ conversationId, state$ }: ConversationStream) {
    // A run that never reached its terminal event leaves a half-written answer behind; drop it.
    if (state$.getValue().cursor) {
      state$.next(emptyLiveEventsState());
    }
    this.maybeTeardown(conversationId);
  }

  private maybeTeardown(conversationId: string) {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      return;
    }
    const canReclaim = !stream.state$.observed && !stream.state$.getValue().cursor;
    if (!canReclaim) {
      return;
    }
    stream.sub.unsubscribe();
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
    if (!current.events.some((event) => event.execution_id === executionId)) {
      return;
    }
    stream.state$.next(emptyLiveEventsState());
    this.maybeTeardown(conversationId);
  }
}
