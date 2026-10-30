/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitQuery } from '@kbn/alerting-v2-rule-builders';
import type { RuleQuery } from '../../form/types';

export { splitQuery } from '@kbn/alerting-v2-rule-builders';
export type { SplitConfidence, SplitResult } from '@kbn/alerting-v2-rule-builders';

/** Splits a full ES|QL query (e.g. from Discover) into base + breach segment. */
export function discoverQueryToRuleQuery(inlinedQuery: string): RuleQuery {
  const { base, alertBlock } = splitQuery(inlinedQuery);
  return { base, breach: { segment: alertBlock } };
}

/**
 * Outcome of splitting a unified query for the form summary:
 *
 * - 'success'            — base and alert condition both identified
 * - 'no_alert_condition' — base defined, no alert condition
 * - 'split_failed'       — heuristic could not isolate a base (empty base)
 * - 'empty'              — no query entered
 */
export type SplitOutcome = 'success' | 'no_alert_condition' | 'split_failed' | 'empty';

export interface SplitRuleQueryResult {
  query: RuleQuery;
  outcome: SplitOutcome;
}

/**
 * Maps a unified ES|QL query into a rule query and an outcome for the form
 * summary.
 *
 * - `success` — base and breach segment both set.
 * - `no_alert_condition` — base set, empty breach segment.
 * - `split_failed` / `empty` — incomplete split; summary flags the state.
 */
export function splitResultToRuleQuery(fullQuery: string): SplitRuleQueryResult {
  const { base, alertBlock } = splitQuery(fullQuery);

  const hasBase = base.trim().length > 0;
  const hasAlert = alertBlock.trim().length > 0;

  if (hasBase && hasAlert) {
    return { query: { base, breach: { segment: alertBlock } }, outcome: 'success' };
  }
  if (hasBase) {
    return { query: { base, breach: { segment: '' } }, outcome: 'no_alert_condition' };
  }

  return {
    query: { base, breach: { segment: alertBlock } },
    outcome: hasAlert ? 'split_failed' : 'empty',
  };
}

/**
 * Produces a candidate recovery block from an alert block by performing a
 * naive per-operator flip of comparison operators (`>` ↔ `<`, `>=` ↔ `<=`).
 * Uses a single-pass regex substitution to avoid the double-replacement bug
 * that arises from sequential `.replace()` calls on overlapping patterns
 * (e.g. `>=` being matched by both `>=` and `>`).
 *
 * **Important:** This is NOT a logical negation (De Morgan's law). For
 * compound expressions like `a > 1 AND b < 2`, the true negation would be
 * `a <= 1 OR b >= 2` — but this function produces `a < 1 AND b > 2`
 * (flips each operator independently, preserves AND/OR connectives). For
 * single-condition alert blocks this is usually what users want operationally,
 * and it works well as a starting seed for the Recovery query editor.
 */
export function guessRecoveryBlock(alertBlock: string): string {
  const FLIP: Record<string, string> = { '>=': '<=', '<=': '>=', '>': '<', '<': '>' };
  return alertBlock.replace(/>=|<=|>|</g, (op) => FLIP[op] ?? op);
}
