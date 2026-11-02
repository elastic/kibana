/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject, filter, map, share } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { ActiveConversation, BrowserChatEvent } from '@kbn/agent-builder-browser/events';

interface TaggedChatEvent {
  /** The conversation that produced this event. */
  conversationId: string;
  event: BrowserChatEvent;
}

export class EventsService {
  private readonly events$ = new Subject<TaggedChatEvent>();

  /**
   * @deprecated Backed by a single shared `Subject` that interleaves events from every
   * conversation. With concurrent per-conversation streams, consumers cannot reliably
   * attribute an event to its source conversation from this stream alone. Use
   * `getChatEvents$(conversationId)` for per-conversation scoping.
   */
  public readonly obs$: Observable<BrowserChatEvent> = this.events$.pipe(
    map(({ event }) => event),
    share()
  );

  private readonly streamEnded$ = new Subject<string>();
  private readonly streamStarted$ = new Subject<string>();

  private readonly activeConversationState$ = new BehaviorSubject<ActiveConversation | null>(null);
  public readonly activeConversation$ = this.activeConversationState$.asObservable();

  constructor() {}

  propagateChatEvent(conversationId: string, event: ChatEvent) {
    this.events$.next({ conversationId, event });
  }

  /**
   * Returns a hot observable of chat events scoped to a single conversation. Subscribe
   * any time during the events service's lifetime; events emit live as the agent runs
   * the conversation. Subscribers only see events tagged with the matching id.
   */
  getChatEvents$(conversationId: string): Observable<BrowserChatEvent> {
    return this.events$.pipe(
      filter((tagged) => tagged.conversationId === conversationId),
      map(({ event }) => event)
    );
  }

  /**
   * Signals that the client to server stream for this conversation terminated - completed, errored
   * or aborted.
   */
  notifyStreamEnded(conversationId: string) {
    this.streamEnded$.next(conversationId);
  }

  /** Fires once when the stream for this conversation terminates, however it terminates. */
  getStreamEnded$(conversationId: string): Observable<void> {
    return this.streamEnded$.pipe(
      filter((id) => id === conversationId),
      map(() => undefined)
    );
  }

  /**
   * Signals that a client to server stream has begun for this conversation. Global (unlike
   * `notifyStreamEnded`) because a run can start before its stream exists, so the listener
   * must hear starts for conversations it has not seen yet.
   */
  notifyStreamStarted(conversationId: string) {
    this.streamStarted$.next(conversationId);
  }

  /** Fires each time any conversation's stream begins, carrying the conversation id. */
  getStreamStarted$(): Observable<string> {
    return this.streamStarted$.asObservable();
  }

  setActiveConversation(activeConversation: ActiveConversation | null) {
    this.activeConversationState$.next(activeConversation);
  }

  clearActiveConversation() {
    this.activeConversationState$.next(null);
  }

  getActiveConversation(): ActiveConversation | null {
    return this.activeConversationState$.getValue();
  }
}
