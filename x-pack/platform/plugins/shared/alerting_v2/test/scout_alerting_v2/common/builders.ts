/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateActionPolicyDataInput, CreateRuleData } from '@kbn/alerting-v2-schemas';
import { LOOKBACK_WINDOW, SCHEDULE_INTERVAL } from './constants';

/**
 * Defaults used by `buildCreateRuleData` so the integration specs only have to
 * spell out what makes each rule unique (typically `metadata.name`, the
 * `evaluation.query.base`, and the `state_transition` policy under test).
 *
 * Notes:
 * - `schedule` uses the fast test-harness interval (5s every / 1m lookback)
 *   so the executor produces events quickly during integration runs.
 * - `state_transition: { pending_count: 0, recovering_count: 0 }` drives the
 *   lifecycle straight to active/inactive, which is what most executor tests
 *   want. Tests that care about the lifecycle override it explicitly. Signal
 *   rules must opt out via `state_transition: undefined` because the schema
 *   forbids state_transition for `kind: 'signal'`.
 */
const DEFAULTS: CreateRuleData = {
  kind: 'alert',
  metadata: { name: 'scout-rule' },
  schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
  evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
  time_field: '@timestamp',
  recovery_policy: { type: 'no_breach' },
  grouping: { fields: ['host.name'] },
  state_transition: { pending_count: 0, recovering_count: 0 },
};

/**
 * Defaults used by `buildCreateActionPolicyData`. `type` is intentionally
 * omitted so specs exercise the schema's `default('global')` branch; specs
 * that need a single-rule policy override `type` and supply `ruleId`.
 */
const ACTION_POLICY_DEFAULTS: CreateActionPolicyDataInput = {
  name: 'scout-action-policy',
  description: 'Scout action policy',
  destinations: [{ type: 'workflow', id: 'scout-workflow-id' }],
};

export type BuildCreateRuleDataInput = Partial<CreateRuleData>;

export const buildCreateRuleData = (input: BuildCreateRuleDataInput = {}): CreateRuleData => ({
  ...DEFAULTS,
  ...input,
});

export type BuildCreateActionPolicyDataInput = Partial<CreateActionPolicyDataInput>;

export const buildCreateActionPolicyData = (
  input: BuildCreateActionPolicyDataInput = {}
): CreateActionPolicyDataInput => ({
  ...ACTION_POLICY_DEFAULTS,
  ...input,
});

export const buildDestinations = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    type: 'workflow' as const,
    id: `wf-${i}`,
  }));

export const futureIsoDate = (offsetMs: number = 86_400_000): string =>
  new Date(Date.now() + offsetMs).toISOString();
