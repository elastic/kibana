/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject, share } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { ActiveConversation, BrowserChatEvent } from '@kbn/agent-builder-browser/events';

export class EventsService {
  private readonly events$ = new Subject<BrowserChatEvent>();
  public readonly obs$ = this.events$.asObservable().pipe(share());

  private readonly activeConversationState$ = new BehaviorSubject<ActiveConversation | null>(null);
  public readonly activeConversation$ = this.activeConversationState$.asObservable();

  constructor() {}

  propagateChatEvent(event: ChatEvent) {
    this.events$.next(event);
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
