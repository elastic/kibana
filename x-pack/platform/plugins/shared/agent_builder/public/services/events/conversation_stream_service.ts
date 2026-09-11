/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, defer, finalize } from 'rxjs';
import type { ActiveExecutionDraft } from './active_execution_reducer';
import { activeExecutionReducer } from './active_execution_reducer';
import type { EventsService } from './events_service';

export type ChatEventSource = Pick<EventsService, 'getChatEvents$' | 'getRunEnded$'>;

interface ConversationStream {
  conversationId: string;
  state$: BehaviorSubject<ActiveExecutionDraft | null>;
  sub: Subscription;
}

export class ConversationStreamService {
  private readonly streams = new Map<string, ConversationStream>();

  constructor(private readonly source: ChatEventSource) {}

  private ensure(conversationId: string): ConversationStream {
    return this.streams.get(conversationId) ?? this.createStream(conversationId);
  }

  private createStream(conversationId: string): ConversationStream {
    const state$ = new BehaviorSubject<ActiveExecutionDraft | null>(null);
    const sub = this.source
      .getChatEvents$(conversationId)
      .subscribe((event) => state$.next(activeExecutionReducer(state$.getValue(), event)));
    const stream: ConversationStream = { conversationId, state$, sub };
    this.streams.set(conversationId, stream);

    sub.add(this.source.getRunEnded$(conversationId).subscribe(() => this.onRunEnded(stream)));
    return stream;
  }

  private onRunEnded({ conversationId, state$ }: ConversationStream) {
    if (state$.getValue()) {
      state$.next(null);
    }
    this.maybeTeardown(conversationId);
  }

  private maybeTeardown(conversationId: string) {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      return;
    }
    const canReclaim = !stream.state$.observed && !stream.state$.getValue();
    if (!canReclaim) {
      return;
    }
    stream.sub.unsubscribe();
    this.streams.delete(conversationId);
  }

  /**
   * Hot state stream for one conversation. Consumers subscribe (e.g. via `useObservable`)
   * and receive the folded `ActiveExecutionDraft` as the agent runs, `null` when idle.
   */
  getActiveStream$(conversationId: string): Observable<ActiveExecutionDraft | null> {
    return defer(() => this.ensure(conversationId).state$).pipe(
      finalize(() => this.maybeTeardown(conversationId))
    );
  }

  /** Non-reactive snapshot: is this conversation mid-run right now. */
  isStreamActive(conversationId: string): boolean {
    return !!this.streams.get(conversationId)?.state$.getValue();
  }

  releaseStream(conversationId: string) {
    this.maybeTeardown(conversationId);
  }
}
