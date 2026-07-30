/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Catalog of every rule-execution counter name.
 *
 * Single source of truth for counter identifiers. Producers reference these
 * constants when emitting counter contributions on `meta.counters`, which
 * gives typo-safe, discoverable metric names and prevents collisions as the
 * metric surface grows.
 *
 * Adding a new counter is the designated, append-only extension point. It is
 * NOT "touching collection logic" — the middleware and forwarder stay closed.
 */
export const RULE_EXECUTION_COUNTERS = {
  signalsGenerated: 'signalsGenerated',
  ruleEventsGenerated: 'ruleEventsGenerated',
  newEpisodesGenerated: 'newEpisodesGenerated',
  rowsReturnedByQuery: 'rowsReturnedByQuery',
} as const;

/**
 * Union of every counter name in {@link RULE_EXECUTION_COUNTERS}. Use when
 * typing local variables that hold a counter name.
 */
export type RuleExecutionCounter =
  (typeof RULE_EXECUTION_COUNTERS)[keyof typeof RULE_EXECUTION_COUNTERS];
