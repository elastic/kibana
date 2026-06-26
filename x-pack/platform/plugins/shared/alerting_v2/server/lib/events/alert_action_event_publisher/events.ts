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
 * type EpisodeTaggedEvent = BaseAlertActionEvent<
 *   'episode.tagged',
 *   { tags: readonly string[] }
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
  /** New assignee user-profile uid. */
  readonly assigneeUid: string;
}

/**
 * Domain event published when an alerting episode is assigned to a user.
 */
export type EpisodeAssignedEvent = BaseAlertActionEvent<
  typeof EPISODE_ASSIGNED_EVENT_TYPE,
  EpisodeAssignedPayload
>;

/** Discriminator value for {@link EpisodeUnassignedEvent}. */
export const EPISODE_UNASSIGNED_EVENT_TYPE = 'episode.unassigned' as const;

/**
 * Domain event published when the assignee of an alerting episode is cleared.
 * Carries no extra payload beyond the shared envelope.
 */
export type EpisodeUnassignedEvent = BaseAlertActionEvent<
  typeof EPISODE_UNASSIGNED_EVENT_TYPE,
  Record<string, never>
>;

/** Discriminator value for {@link EpisodeAckedEvent}. */
export const EPISODE_ACKED_EVENT_TYPE = 'episode.acked' as const;

/**
 * Domain event published when an alerting episode is acknowledged.
 * Carries no extra payload beyond the shared envelope.
 */
export type EpisodeAckedEvent = BaseAlertActionEvent<
  typeof EPISODE_ACKED_EVENT_TYPE,
  Record<string, never>
>;

/** Discriminator value for {@link EpisodeUnackedEvent}. */
export const EPISODE_UNACKED_EVENT_TYPE = 'episode.unacked' as const;

/**
 * Domain event published when acknowledgement is removed from an alerting episode.
 * Carries no extra payload beyond the shared envelope.
 */
export type EpisodeUnackedEvent = BaseAlertActionEvent<
  typeof EPISODE_UNACKED_EVENT_TYPE,
  Record<string, never>
>;

/** Discriminator value for {@link EpisodeTaggedEvent}. */
export const EPISODE_TAGGED_EVENT_TYPE = 'episode.tagged' as const;

/** Payload of {@link EpisodeTaggedEvent}. */
export interface EpisodeTaggedPayload {
  /** Tags added to the alerting episode. */
  readonly tags: readonly string[];
}

/**
 * Domain event published when tags are added to an alerting episode.
 */
export type EpisodeTaggedEvent = BaseAlertActionEvent<
  typeof EPISODE_TAGGED_EVENT_TYPE,
  EpisodeTaggedPayload
>;

/** Discriminator value for {@link EpisodeSnoozedEvent}. */
export const EPISODE_SNOOZED_EVENT_TYPE = 'episode.snoozed' as const;

/** Payload of {@link EpisodeSnoozedEvent}. */
export interface EpisodeSnoozedPayload {
  /** ISO datetime when the snooze expires, or `null` when it has no expiry. */
  readonly expiry: string | null;
}

/**
 * Domain event published when an alerting episode is snoozed.
 */
export type EpisodeSnoozedEvent = BaseAlertActionEvent<
  typeof EPISODE_SNOOZED_EVENT_TYPE,
  EpisodeSnoozedPayload
>;

/** Discriminator value for {@link EpisodeUnsnoozedEvent}. */
export const EPISODE_UNSNOOZED_EVENT_TYPE = 'episode.unsnoozed' as const;

/**
 * Domain event published when snooze is removed from an alerting episode.
 * Carries no extra payload beyond the shared envelope.
 */
export type EpisodeUnsnoozedEvent = BaseAlertActionEvent<
  typeof EPISODE_UNSNOOZED_EVENT_TYPE,
  Record<string, never>
>;

/** Discriminator value for {@link EpisodeActivatedEvent}. */
export const EPISODE_ACTIVATED_EVENT_TYPE = 'episode.activated' as const;

/** Payload of {@link EpisodeActivatedEvent}. */
export interface EpisodeActivatedPayload {
  /** Reason the alerting episode was activated. */
  readonly reason: string;
}

/**
 * Domain event published when an alerting episode is activated.
 */
export type EpisodeActivatedEvent = BaseAlertActionEvent<
  typeof EPISODE_ACTIVATED_EVENT_TYPE,
  EpisodeActivatedPayload
>;

/** Discriminator value for {@link EpisodeDeactivatedEvent}. */
export const EPISODE_DEACTIVATED_EVENT_TYPE = 'episode.deactivated' as const;

/** Payload of {@link EpisodeDeactivatedEvent}. */
export interface EpisodeDeactivatedPayload {
  /** Reason the alerting episode was deactivated. */
  readonly reason: string;
}

/**
 * Domain event published when an alerting episode is deactivated.
 */
export type EpisodeDeactivatedEvent = BaseAlertActionEvent<
  typeof EPISODE_DEACTIVATED_EVENT_TYPE,
  EpisodeDeactivatedPayload
>;

/**
 * Discriminated union of every alert-action domain event.
 *
 * Extend this when a new alert-action event type is added. Cross-domain
 * events (rule executor, dispatcher) live under their own unions and are
 * composed into `AlertingDomainEvent` in `lib/events/domain_events`.
 */
export type AlertActionEvent =
  | EpisodeAssignedEvent
  | EpisodeUnassignedEvent
  | EpisodeAckedEvent
  | EpisodeUnackedEvent
  | EpisodeTaggedEvent
  | EpisodeSnoozedEvent
  | EpisodeUnsnoozedEvent
  | EpisodeActivatedEvent
  | EpisodeDeactivatedEvent;
