/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Common envelope shared by every alert-action domain event.
 *
 * Captures the episode context (rule / group / episode / space), the actor
 * who performed the action, and when the action occurred. Lifted out of
 * individual events so subscribers can read this metadata uniformly
 * (without switching on `type`) and so the publisher can construct it
 * once per emit call.
 */
export interface AlertActionEventEnvelope {
  /** ISO timestamp of when the event occurred. */
  readonly occurredAt: string;
  readonly groupHash: string;
  readonly episodeId: string;
  readonly ruleId: string;
  readonly spaceId: string;
  /**
   * User-profile uid of the actor who performed the action, or `null`
   * when the action was performed by an internal/system context (no user).
   */
  readonly actorUid: string | null;
}

/**
 * Structure of every alert-action domain event.
 *
 * Concrete events specialise:
 *  - `TType`    — the string-literal discriminator (e.g. `'episode.assigned'`).
 *  - `TPayload` — the event-specific payload shape.
 *
 * The shared envelope fields stay at the top level so subscribers can read
 * them uniformly. Per-event data lives under `payload`.
 *
 * @example
 * ```ts
 * type EpisodeAckedEvent = BaseAlertActionEvent<
 *   'episode.acked',
 *   { reason: string | null }
 * >;
 * ```
 */
export interface BaseAlertActionEvent<TType extends string, TPayload extends object>
  extends AlertActionEventEnvelope {
  readonly type: TType;
  readonly payload: TPayload;
}

/** Discriminator value for {@link EpisodeAssignedEvent}. */
export const EPISODE_ASSIGNED_EVENT_TYPE = 'episode.assigned' as const;

/** Payload of {@link EpisodeAssignedEvent}. */
export interface EpisodeAssignedPayload {
  /** New assignee user-profile uid, or `null` when unassigning. */
  readonly assigneeUid: string | null;
}

/**
 * Domain event published when the assignee of an alerting episode changes —
 * either set to a specific user, or cleared to `null`.
 */
export type EpisodeAssignedEvent = BaseAlertActionEvent<
  typeof EPISODE_ASSIGNED_EVENT_TYPE,
  EpisodeAssignedPayload
>;

/**
 * Discriminated union of every alert-action domain event.
 *
 * Extend this when a new alert-action event type is added (ack, snooze,
 * tag, …). Cross-domain events (rule executor, dispatcher) live under
 * their own unions and are composed into `AlertingDomainEvent` in
 * `lib/events/domain_events`.
 */
export type AlertActionEvent = EpisodeAssignedEvent;
