/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EffectiveResolutionRule } from '../rule_client';
import type {
  AutomatedResolutionState,
  PerRuleState,
} from '../maintainers/automated_resolution/types';
import { readRunCounts } from '../maintainers/automated_resolution/rule_run_counts';
import type { EntityRuleFailure } from './types';

export const RULE_HEALTH_STATUSES = ['failing', 'healthy', 'not_run_yet', 'off'] as const;
export type RuleHealthStatus = (typeof RULE_HEALTH_STATUSES)[number];

/** What the rule did in its last successful run. Declines are normal, so they are counts, not alarms. */
export interface RuleLastRun {
  links_created: number;
  skipped_ambiguous: number;
  skipped_oversized: number;
  skipped_noop: number;
}

export interface RuleHealth {
  rule_id: string;
  kind: string;
  description: string;
  enabled: boolean;
  status: RuleHealthStatus;
  failure?: EntityRuleFailure & { last_failed_at: string | null };
  last_run?: RuleLastRun;
  last_processed_timestamp: string | null;
}

export interface RulesHealth {
  failing: number;
  rules: RuleHealth[];
}

const readString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const toLastRun = (lastRun: PerRuleState['lastRun']): RuleLastRun | undefined =>
  readRunCounts(lastRun);

const toFailure = (state: PerRuleState): RuleHealth['failure'] => {
  const consecutiveFailures =
    typeof state.consecutiveFailures === 'number' ? state.consecutiveFailures : 0;
  if (consecutiveFailures === 0) {
    return undefined;
  }
  return {
    last_error: readString(state.lastError),
    consecutive_failures: consecutiveFailures,
    next_attempt_at: readString(state.nextAttemptAt),
    last_failed_at: readString(state.lastFailedAt),
  };
};

/** Summarises, per rule, whether it is off, failing, healthy or has not run yet. Pure. */
export const summarizeRulesHealth = (
  rules: readonly EffectiveResolutionRule[],
  maintainerState: AutomatedResolutionState | null
): RulesHealth => {
  const health = rules.map((rule): RuleHealth => {
    const state = maintainerState?.rules[rule.id];
    const base = {
      rule_id: rule.id,
      kind: rule.kind,
      description: rule.description,
      enabled: rule.enabled,
      last_processed_timestamp: readString(state?.lastProcessedTimestamp),
    };
    if (!rule.enabled) {
      return { ...base, status: 'off' };
    }
    const failure = state ? toFailure(state) : undefined;
    if (failure) {
      return { ...base, status: 'failing', failure };
    }
    const lastRun = state ? toLastRun(state.lastRun) : undefined;
    return lastRun
      ? { ...base, status: 'healthy', last_run: lastRun }
      : { ...base, status: 'not_run_yet' };
  });
  return { failing: health.filter(({ status }) => status === 'failing').length, rules: health };
};
