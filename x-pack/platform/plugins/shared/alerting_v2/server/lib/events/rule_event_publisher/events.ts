/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';

/**
 * Data carried by every rule-lifecycle domain event.
 *
 * This is the internal event payload. It carries the domain rule
 * ({@link RuleResponse}, exactly what the public API returns) plus the
 * envelope fields that are not part of the rule itself (`spaceId`,
 * `correlationId`). Consumers project from this: the workflow subscriber
 * exposes `{ ruleId, spaceId, tags }`, while the change-history subscriber
 * uses the full `rule` as its snapshot.
 */
export interface RuleEventPayload {
  /** Rule id. Always present, even when the full `rule` could not be resolved. */
  readonly ruleId: string;
  /** Kibana space the rule lives in. Not part of {@link RuleResponse}. */
  readonly spaceId: string;
  /**
   * Post-change domain rule. Absent only in the bulk-delete fallback where the
   * pre-delete state could not be read (the event is still emitted so workflow
   * triggers fire, but nothing orderable can be logged to change history).
   */
  readonly rule?: RuleResponse;
  /**
   * Shared id linking events emitted by the same bulk operation. Only present
   * for bulk emits.
   */
  readonly correlationId?: string;
}

/**
 * Structure of every rule-lifecycle domain event.
 *
 * Concrete events specialise `TType` — the string-literal discriminator
 * (e.g. `'rule.created'`). Per-event data lives under `payload`.
 */
export interface BaseRuleEvent<TType extends string> {
  readonly type: TType;
  readonly payload: RuleEventPayload;
}

/** Discriminator value for {@link RuleCreatedEvent}. */
export const RULE_CREATED_EVENT_TYPE = 'rule.created' as const;

/** Domain event published when a single alerting rule is created. */
export type RuleCreatedEvent = BaseRuleEvent<typeof RULE_CREATED_EVENT_TYPE>;

/** Discriminator value for {@link RuleUpdatedEvent}. */
export const RULE_UPDATED_EVENT_TYPE = 'rule.updated' as const;

/** Domain event published when a single alerting rule is updated. */
export type RuleUpdatedEvent = BaseRuleEvent<typeof RULE_UPDATED_EVENT_TYPE>;

/** Discriminator value for {@link RuleDeletedEvent}. */
export const RULE_DELETED_EVENT_TYPE = 'rule.deleted' as const;

/** Domain event published when a single alerting rule is deleted. */
export type RuleDeletedEvent = BaseRuleEvent<typeof RULE_DELETED_EVENT_TYPE>;

/** Discriminator value for {@link RuleEnabledEvent}. */
export const RULE_ENABLED_EVENT_TYPE = 'rule.enabled' as const;

/** Domain event published when a single alerting rule is enabled. */
export type RuleEnabledEvent = BaseRuleEvent<typeof RULE_ENABLED_EVENT_TYPE>;

/** Discriminator value for {@link RuleDisabledEvent}. */
export const RULE_DISABLED_EVENT_TYPE = 'rule.disabled' as const;

/** Domain event published when a single alerting rule is disabled. */
export type RuleDisabledEvent = BaseRuleEvent<typeof RULE_DISABLED_EVENT_TYPE>;

/**
 * Discriminated union of every rule-lifecycle domain event.
 *
 * Extend this when a new rule lifecycle event type is added. Cross-domain
 * events (alert actions, rule executor, dispatcher) live under their own
 * unions and are composed into `AlertingDomainEvent` in `lib/events/domain_events`.
 */
export type RuleEvent =
  | RuleCreatedEvent
  | RuleUpdatedEvent
  | RuleDeletedEvent
  | RuleEnabledEvent
  | RuleDisabledEvent;
