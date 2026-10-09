/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type {
  ApiReference,
  ApiStateChangedEventData,
  Conversation,
} from '@kbn/agent-builder-common';
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

export interface ApiStateChangesOptions {
  /**
   * Operations to listen for. Each entry pairs a target with `*`, a namespace wildcard such as
   * `cases.*`, or an exact operation id such as `cases.create-case`, and only
   * matches operations on its own target.
   */
  apis: readonly ApiReference[];
}

/**
 * Public-facing contract for AgentBuilder's events service.
 */
export interface EventsServiceStartContract {
  /**
   * Hot observable of chat events from every conversation, interleaved.
   *
   * @deprecated With concurrent per-conversation streams, events from multiple
   * in-flight conversations are interleaved here and consumers cannot reliably
   * attribute an event to its source conversation. Use `getChatEvents$(conversationId)`
   * to scope a subscription to a single conversation. Will be removed in a future
   * release once known consumers (agent_builder_dashboards, workflows_management) have migrated.
   */
  chat$: Observable<BrowserChatEvent>;

  /**
   * Returns a hot observable of chat events scoped to a single conversation. Subscribe
   * at any point during the events service's lifetime; events emit live as the agent
   * runs that conversation. Subscribers only see events tagged with the matching id.
   *
   * Use this in preference to `chat$` whenever your consumer cares about a specific
   * conversation. Concurrent streams mean `chat$` is no longer single-conversation,
   * and most chat event payloads do not carry a `conversation_id` field that you can
   * filter on directly.
   *
   * Migration patterns (these are recommendations):
   *
   *   // Before — assumes only one conversation streams at a time:
   *   events.chat$.subscribe((event) => { ... });
   *
   *   // After — scope to a known conversation:
   *   events.getChatEvents$(conversationId).subscribe((event) => { ... });
   *
   *   // After — scope to whichever conversation the UI is currently focused on:
   *   events.ui.activeConversation$.pipe(
   *     filter((c): c is ActiveConversation => c?.id != null),
   *     switchMap((c) => events.getChatEvents$(c.id!))
   *   ).subscribe((event) => { ... });
   */
  getChatEvents$: (conversationId: string) => Observable<BrowserChatEvent>;

  /**
   * Returns a hot observable of the successful, non-read-only operations the agent ran through
   * `execute_api` in the conversation the UI is focused on, following `ui.activeConversation$`.
   * Standalone executions report nothing, and past operations are not replayed.
   *
   *   events.getApiStateChanges$({
   *     apis: [{ target: 'kibana', api: 'cases.*' }],
   *   }).subscribe(({ api, method, path }) => refreshCases());
   *
   * @param options - The operations to listen for.
   * @returns The matching operations, each with its target, id, HTTP method and request path.
   */
  getApiStateChanges$: (options: ApiStateChangesOptions) => Observable<ApiStateChangedEventData>;

  /**
   * Chat UI-shell state observables.
   */
  ui: ChatUiEventsContract;
}
