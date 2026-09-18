/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, defer, finalize } from 'rxjs';
import type { PromptResponseEvent } from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from './active_execution_reducer';
import { activeExecutionReducer, withPromptResponse } from './active_execution_reducer';
import type { EventsService } from './events_service';

export type ChatEventSource = Pick<EventsService, 'getChatEvents$' | 'getStreamEnded$'>;

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

    sub.add(
      this.source.getStreamEnded$(conversationId).subscribe(() => this.onStreamEnded(stream))
    );
    return stream;
  }

  private onStreamEnded({ conversationId, state$ }: ConversationStream) {
    const current = state$.getValue();
    if (current && current.status !== 'completed') {
      state$.next(null);
    }
    this.maybeTeardown(conversationId);
  }

  private maybeTeardown(conversationId: string) {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      return;
    }
    const value = stream.state$.getValue();
    const isSealed = value?.status === 'completed';
    const canReclaim = !stream.state$.observed && (!value || isSealed);
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

  getSnapshot(conversationId: string): ActiveExecutionDraft | null {
    return this.streams.get(conversationId)?.state$.getValue() ?? null;
  }

  recordPromptResponse(conversationId: string, promptResponse: PromptResponseEvent) {
    const { state$ } = this.ensure(conversationId);
    state$.next(withPromptResponse(state$.getValue(), promptResponse));
  }

  clearPromptResponse(conversationId: string, promptRequestedEventId: string) {
    const stream = this.streams.get(conversationId);
    const current = stream?.state$.getValue();
    if (!stream || !current?.promptResponse) {
      return;
    }
    if (current.promptResponse.data.prompt_requested_event_id !== promptRequestedEventId) {
      return;
    }
    const { promptResponse, ...rest } = current;
    stream.state$.next(rest);
    this.maybeTeardown(conversationId);
  }

  /** Drops a completed draft once its saved replacement is in the cache. */
  clearPersistedExecution(conversationId: string, executionId: string) {
    const stream = this.streams.get(conversationId);
    const current = stream?.state$.getValue();
    if (!stream || !current) {
      return;
    }
    if (current.status !== 'completed' || current.executionId !== executionId) {
      return;
    }
    stream.state$.next(null);
    this.maybeTeardown(conversationId);
  }

  releaseStream(conversationId: string) {
    this.maybeTeardown(conversationId);
  }
}
