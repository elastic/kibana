/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, defer, finalize, map } from 'rxjs';
import type { LiveEventsState, TimelineDisplayEvent } from './sse_to_events';
import { emptyLiveEventsState, sseToEvents } from './sse_to_events';
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
