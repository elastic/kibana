/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';

/**
 * Data carried by every action policy lifecycle domain event.
 *
 * Carries the domain policy ({@link ActionPolicyResponse}, exactly what the
 * public API returns) plus the envelope fields that are not part of the policy
 * itself (`spaceId`, `correlationId`).
 */
export interface ActionPolicyEventPayload {
  /** Action policy id. Always present, even when the full `policy` could not be read. */
  readonly actionPolicyId: string;
  /** Kibana space the action policy lives in. Not part of {@link ActionPolicyResponse}. */
  readonly spaceId: string;
  /**
   * Post-change domain policy (for `action_policy.deleted`, the policy as it was
   * before the delete). Absent when the client could not read the policy after a
   * bulk write, or before a bulk delete.
   */
  readonly policy?: ActionPolicyResponse;
  /**
   * Shared id linking events emitted by the same bulk operation. Only present
   * for bulk emits.
   */
  readonly correlationId?: string;
}

/**
 * Structure of every action policy lifecycle domain event.
 *
 * Concrete events specialise `TType`, the string-literal discriminator
 * (e.g. `'action_policy.created'`). Per-event data lives under `payload`.
 */
export interface BaseActionPolicyEvent<TType extends string> {
  readonly type: TType;
  readonly payload: ActionPolicyEventPayload;
}

/** Discriminator value for {@link ActionPolicyCreatedEvent}. */
export const ACTION_POLICY_CREATED_EVENT_TYPE = 'action_policy.created' as const;

/** Domain event published when an action policy is created. */
export type ActionPolicyCreatedEvent = BaseActionPolicyEvent<
  typeof ACTION_POLICY_CREATED_EVENT_TYPE
>;

/** Discriminator value for {@link ActionPolicyUpdatedEvent}. */
export const ACTION_POLICY_UPDATED_EVENT_TYPE = 'action_policy.updated' as const;

/** Domain event published when an action policy is updated. */
export type ActionPolicyUpdatedEvent = BaseActionPolicyEvent<
  typeof ACTION_POLICY_UPDATED_EVENT_TYPE
>;

/** Discriminator value for {@link ActionPolicyDeletedEvent}. */
export const ACTION_POLICY_DELETED_EVENT_TYPE = 'action_policy.deleted' as const;

/** Domain event published when an action policy is deleted. */
export type ActionPolicyDeletedEvent = BaseActionPolicyEvent<
  typeof ACTION_POLICY_DELETED_EVENT_TYPE
>;

/** Discriminator value for {@link ActionPolicyEnabledEvent}. */
export const ACTION_POLICY_ENABLED_EVENT_TYPE = 'action_policy.enabled' as const;

/** Domain event published when an action policy is enabled. */
export type ActionPolicyEnabledEvent = BaseActionPolicyEvent<
  typeof ACTION_POLICY_ENABLED_EVENT_TYPE
>;

/** Discriminator value for {@link ActionPolicyDisabledEvent}. */
export const ACTION_POLICY_DISABLED_EVENT_TYPE = 'action_policy.disabled' as const;

/** Domain event published when an action policy is disabled. */
export type ActionPolicyDisabledEvent = BaseActionPolicyEvent<
  typeof ACTION_POLICY_DISABLED_EVENT_TYPE
>;

/**
 * Discriminated union of every action policy lifecycle domain event. Composed
 * into `AlertingDomainEvent` in `lib/events/domain_events`.
 */
export type ActionPolicyEvent =
  | ActionPolicyCreatedEvent
  | ActionPolicyUpdatedEvent
  | ActionPolicyDeletedEvent
  | ActionPolicyEnabledEvent
  | ActionPolicyDisabledEvent;
