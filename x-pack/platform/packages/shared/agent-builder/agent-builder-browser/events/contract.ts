/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Conversation } from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from './events';

export interface ActiveConversation {
  /**
   * Active conversation id, if one already exists.
   * Undefined means we're currently in a new conversation.
   */
  id?: string;
  /**
   * The currently bound conversation, when it has been successfully fetched.
   * Undefined while the conversation is new, still loading, or failed to load.
   */
  conversation?: Conversation;
}

export interface ChatUiEventsContract {
  /**
   * Emits the currently active conversation binding for both the embeddable sidebar and
   * the full-page routed chat. Emits `null` when no chat surface is currently bound.
   *
   * Backed by a `BehaviorSubject`: new subscribers receive the current value immediately.
   */
  activeConversation$: Observable<ActiveConversation | null>;
}

/**
 * Public-facing contract for AgentBuilder's events service.
 */
export interface EventsServiceStartContract {
  /**
   * (hot) observable of all chat events.
   */
  chat$: Observable<BrowserChatEvent>;
  /**
   * Chat UI-shell state observables.
   */
  ui: ChatUiEventsContract;
}
