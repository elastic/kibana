/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';

// ---------------------------------------------------------------------------
// Session mode
// ---------------------------------------------------------------------------

/**
 * Discriminates between a traditional interactive conversation (default) and
 * a long-lived standing session that can be woken up by external triggers.
 */
export type SessionMode = 'interactive' | 'standing';

// ---------------------------------------------------------------------------
// Round input source
// ---------------------------------------------------------------------------

/**
 * Describes what initiated a conversation round.
 * Absent / undefined is treated as 'human' for backwards compatibility.
 */
export type RoundInputSource =
  | 'human'
  | 'alert_trigger'
  | 'schedule_trigger'
  | 'reminder_trigger'
  | 'webhook_trigger'
  | 'session_message';

// ---------------------------------------------------------------------------
// Trigger contexts — type-specific event payloads
// ---------------------------------------------------------------------------

export interface AlertTriggerContext {
  type: 'alert_trigger';
  subscription_id: string;
  event: {
    rule_id: string;
    rule_name: string;
    alert_ids: string[];
    severity?: string;
    tags?: string[];
    context?: Record<string, unknown>;
  };
}

export interface ScheduleTriggerContext {
  type: 'schedule_trigger';
  subscription_id: string;
  event: {
    fired_at: string;
    /** Human-readable description of the schedule (e.g. "every 15 minutes"). */
    schedule_description: string;
  };
}

export interface ReminderTriggerContext {
  type: 'reminder_trigger';
  /** Same as the reminder subscription ID. */
  subscription_id: string;
  event: {
    reminder_id: string;
    note?: string;
    fired_at: string;
  };
}

export interface WebhookTriggerContext {
  type: 'webhook_trigger';
  subscription_id: string;
  event: {
    payload: Record<string, unknown>;
    received_at: string;
  };
}

export interface SessionMessageTriggerContext {
  type: 'session_message';
  /** Not tied to a subscription — subscription_id is absent. */
  subscription_id: undefined;
  event: {
    from_session_id: string;
    from_agent_id: string;
    message: string;
    message_id: string;
    context?: Record<string, unknown>;
  };
}

export type TriggerContext =
  | AlertTriggerContext
  | ScheduleTriggerContext
  | ReminderTriggerContext
  | WebhookTriggerContext
  | SessionMessageTriggerContext;

// ---------------------------------------------------------------------------
// Trigger subscriptions — persisted on the session
// ---------------------------------------------------------------------------

interface TriggerSubscriptionBase {
  /** Unique subscription ID within the session. */
  id: string;
  /** When this subscription was created. */
  created_at: string;
}

export interface AlertTriggerSubscription extends TriggerSubscriptionBase {
  type: 'alert_trigger';
  config: {
    rule_id: string;
    rule_name?: string;
  };
  /** ID of the Kibana Actions action that was registered on the rule. */
  alert_action_id: string;
}

export interface ScheduleTriggerSubscription extends TriggerSubscriptionBase {
  type: 'schedule_trigger';
  config: {
    /** Simple interval string, e.g. "15m", "1h". */
    interval: string;
    /** Human-readable description stored for display in the UI. */
    description: string;
  };
  /** Task Manager task ID. */
  task_id: string;
}

export interface ReminderTriggerSubscription extends TriggerSubscriptionBase {
  type: 'reminder_trigger';
  /** Always true — reminders are one-shot and auto-remove on fire. */
  one_shot: true;
  config: {
    fires_at: string;
    note?: string;
  };
  /** Task Manager task ID. */
  task_id: string;
}

export interface WebhookTriggerSubscription extends TriggerSubscriptionBase {
  type: 'webhook_trigger';
  config: {
    /** HMAC-signed token embedded in the webhook URL. */
    token: string;
    /** Optional expiry; no expiry means the webhook lives until unsubscribed. */
    expires_at?: string;
  };
}

export type TriggerSubscription =
  | AlertTriggerSubscription
  | ScheduleTriggerSubscription
  | ReminderTriggerSubscription
  | WebhookTriggerSubscription;

// ---------------------------------------------------------------------------
// Pending trigger queue — events waiting while the session is active
// ---------------------------------------------------------------------------

export interface PendingTriggerEvent {
  /** Unique event ID, used to deduplicate if needed. */
  id: string;
  /** When the event arrived and was appended to the queue. */
  queued_at: string;
  /** The full trigger context that will be injected as the next round's input. */
  context: TriggerContext;
}

// ---------------------------------------------------------------------------
// Standing session state — stored in ConversationInternalState
// ---------------------------------------------------------------------------

export type StandingSessionStatus = 'active' | 'idle' | 'terminated';

export interface StandingSessionState {
  status: StandingSessionStatus;
  /** All active trigger subscriptions. Reminders auto-remove on fire. */
  trigger_subscriptions: TriggerSubscription[];
  /** Events that arrived while the session was active — drained one at a time after each round. */
  pending_triggers: PendingTriggerEvent[];
  /** ISO timestamp of the last round start (human or trigger). */
  last_active_at: string;
  /** Auto-terminate after this many seconds of idle time. Absent means no TTL. */
  ttl_seconds?: number;
  /** The user who created this session; their credentials are used for background execution. */
  created_by: UserIdAndName;
  /**
   * The execution ID of the currently running round.
   * Used by drainQueue for a race-condition safety check — ensures that only the
   * execution that started a round can advance the queue when it completes.
   */
  active_execution_id?: string;
  /** GenAI connector override applied to every round. Falls back to the agent's default when absent. */
  connector_id?: string;
  /** System prompt override injected as `instructions` into the agent configuration for every round. */
  system_prompt_override?: string;
}

// ---------------------------------------------------------------------------
// Session list / filter types
// ---------------------------------------------------------------------------

export interface SessionListOptions {
  agent_id?: string;
  status?: StandingSessionStatus;
}
