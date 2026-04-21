/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { BrowserChatEvent } from './events';

export interface EmbeddableConversationChange {
  /**
   * Active conversation id, if one already exists.
   * Undefined means we're currently in a new conversation.
   */
  id?: string;
  /**
   * Existing attachments in the conversation we changed to.
   * Only present when switching to an existing conversation (when id is defined).
   */
  attachments?: VersionedAttachment[];
}

export interface ChatUiEventsContract {
  /**
   * Emits the currently active conversation binding for both the embeddable sidebar and
   * the full-page routed chat. Emits `null` when no chat surface is currently bound.
   *
   * Backed by a `BehaviorSubject`: new subscribers receive the current value immediately.
   */
  activeConversation$: Observable<EmbeddableConversationChange | null>;
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
