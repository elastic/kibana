/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  Conversation,
  ConversationWithoutRounds,
  TriggerContext,
  TriggerSubscription,
  SessionListOptions,
  StandingSessionStatus,
} from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

export interface CreateSessionParams {
  /** ID of the agent to bind this session to. */
  agent_id: string;
  /** Human-readable name shown in the sessions list. */
  name: string;
  /**
   * Optional initial system prompt override for this session.
   * When absent the agent's default system prompt is used.
   */
  system_prompt_override?: string;
  /** Optional auto-termination TTL in seconds. Absent means no TTL. */
  ttl_seconds?: number;
  /** Optional GenAI connector override. Falls back to the agent's default. */
  connector_id?: string;
}

// ---------------------------------------------------------------------------
// Enqueue result
// ---------------------------------------------------------------------------

export interface EnqueueTriggerResult {
  /**
   * 'injected' — session was idle; a new round has been started immediately.
   * 'queued'   — session was active; event is in pending_triggers and will be
   *              processed when the current round completes.
   */
  status: 'injected' | 'queued';
}

// ---------------------------------------------------------------------------
// Send-message result
// ---------------------------------------------------------------------------

export interface SendMessageResult {
  message_id: string;
  status: 'injected' | 'queued';
}

// ---------------------------------------------------------------------------
// Session client — scoped to a request (user + space)
// ---------------------------------------------------------------------------

export interface SessionClient {
  /**
   * Create a new standing session. The session starts in 'idle' status.
   * The creator's credentials (from the scoped request) are stored and reused
   * for all background (trigger-fired) executions.
   */
  create(params: CreateSessionParams): Promise<Conversation>;

  /**
   * Retrieve a standing session by its conversation ID, including all rounds.
   */
  get(conversationId: string): Promise<Conversation>;

  /**
   * List standing sessions for the current user's space.
   */
  list(options?: SessionListOptions): Promise<ConversationWithoutRounds[]>;

  /**
   * Terminate a session: cleans up all trigger subscriptions (Task Manager tasks,
   * alert actions, webhook tokens) and sets status to 'terminated'.
   * Subsequent enqueue calls on a terminated session throw.
   */
  terminate(conversationId: string): Promise<void>;

  /**
   * Enqueue an external trigger event into a session's queue.
   *
   * - If the session is 'idle': starts a new round immediately and returns { status: 'injected' }.
   * - If the session is 'active': appends to pending_triggers and returns { status: 'queued' }.
   * - If the session is 'terminated': throws.
   *
   * Called by: Task Manager trigger tasks, alert action handlers, webhook endpoint, session.send_message tool.
   */
  enqueueTrigger(conversationId: string, context: TriggerContext): Promise<EnqueueTriggerResult>;

  /**
   * Called by the execution service after each standing-session round completes.
   * Checks pending_triggers: if any events are queued, starts the next round immediately.
   * If the queue is empty, transitions the session to 'idle'.
   *
   * @param forExecutionId - When provided, drain is skipped if this is no longer the active
   *   execution ID (race-condition guard).
   */
  drainQueue(conversationId: string, forExecutionId?: string): Promise<void>;

  /**
   * Add a trigger subscription to the session (called by session.subscribe_* tools).
   * The subscription is appended to standing_session.trigger_subscriptions.
   */
  addSubscription(conversationId: string, subscription: TriggerSubscription): Promise<void>;

  /**
   * Remove a trigger subscription by ID (called by session.unsubscribe tool).
   * Returns the removed subscription so the caller can clean up external resources
   * (e.g., cancel the TM task or alert action).
   * Throws if the subscription ID is not found.
   */
  removeSubscription(conversationId: string, subscriptionId: string): Promise<TriggerSubscription>;

  /**
   * Update the session's lifecycle status.
   * Used internally by the execution service when a round starts (→ active)
   * and by drainQueue (→ idle when queue is empty).
   */
  setStatus(conversationId: string, status: StandingSessionStatus): Promise<void>;
}

// ---------------------------------------------------------------------------
// Sessions start contract — exposed on AgentBuilderPluginStart
// ---------------------------------------------------------------------------

export interface SessionsStart {
  /**
   * Returns a session client scoped to the given request's user and space.
   * The client uses the request's credentials for all Saved Objects access
   * and stores them as the creator credentials for background executions.
   */
  getScopedClient(opts: { request: KibanaRequest }): SessionClient;
}
