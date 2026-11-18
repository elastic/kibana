/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * PROPOSED contract: what a single entity's resolution rule check returns. Prototype only;
 * not a stable API. See the proposal for the "linkage explanation" this would feed.
 */
export const ENTITY_RULE_CHECK_STATUSES = [
  'failing',
  'no_data',
  'declined',
  'would_link',
  'nothing_to_link',
  'not_applicable',
  'off',
] as const;

export type EntityRuleCheckStatus = (typeof ENTITY_RULE_CHECK_STATUSES)[number];

/** The saved failure state of a rule, copied from the automated-resolution task state. */
export interface EntityRuleFailure {
  last_error: string | null;
  consecutive_failures: number;
  next_attempt_at: string | null;
}

export interface EntityRuleCheckResult {
  rule_id: string;
  status: EntityRuleCheckStatus;
  /** One plain sentence saying why the rule has this status for this entity. */
  reason: string;
  /** Short supporting facts, for example the group size. Never contains match values. */
  details: string[];
  /** For `would_link`: the entity the group would be linked onto. */
  target_id?: string;
  /** For `would_link`: the entities that would become aliases of the target. */
  would_link_ids?: string[];
  /** For `failing`: the saved failure state. */
  failure?: EntityRuleFailure;
}

export interface EntityRuleCheckSummary {
  /** Rules that are failing, have no data, or declined this entity's group. */
  needs_attention: number;
  would_link: number;
  /** Rules that apply to this entity and are not a problem. */
  applied: number;
  healthy: boolean;
}

export interface EntityRuleCheck {
  entity_id: string;
  entity_namespace: string;
  entity_type: string;
  /** The target this entity is already linked to, when it is an alias. */
  resolved_to: string | null;
  summary: EntityRuleCheckSummary;
  rules: EntityRuleCheckResult[];
}
