/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLUTION_RULE_CONFIGS } from '../rule_registry';
import type { EffectiveResolutionRule } from '../rule_client';
import type { AutomatedResolutionState } from '../maintainers/automated_resolution/types';
import { summarizeRulesHealth } from './rules_health';

const effectiveRules = (): EffectiveResolutionRule[] =>
  RESOLUTION_RULE_CONFIGS.map((config) => ({
    id: config.id,
    kind: config.kind,
    description: config.description,
    managed: true as const,
    enabled: config.defaultEnabled,
  }));

const statusOf = (health: ReturnType<typeof summarizeRulesHealth>, ruleId: string) =>
  health.rules.find(({ rule_id: id }) => id === ruleId);

describe('summarizeRulesHealth', () => {
  it('marks every rule off or not run yet when the maintainer has no state', () => {
    const health = summarizeRulesHealth(effectiveRules(), null);
    expect(statusOf(health, 'email_exact_match')?.status).toBe('not_run_yet');
    expect(statusOf(health, 'crowdstrike_sid_bridge')?.status).toBe('off');
    expect(health.failing).toBe(0);
  });

  it('reports a failing rule with its error, streak and next attempt', () => {
    const state: AutomatedResolutionState = {
      version: 3,
      rules: {
        email_exact_match: {
          lastProcessedTimestamp: null,
          lastRun: null,
          consecutiveFailures: 4,
          lastError: 'circuit_breaking_exception',
          lastFailedAt: '2026-11-16T10:00:00.000Z',
          nextAttemptAt: '2026-11-16T12:00:00.000Z',
        },
      },
    };
    const health = summarizeRulesHealth(effectiveRules(), state);
    expect(statusOf(health, 'email_exact_match')).toMatchObject({
      status: 'failing',
      failure: {
        last_error: 'circuit_breaking_exception',
        consecutive_failures: 4,
        next_attempt_at: '2026-11-16T12:00:00.000Z',
        last_failed_at: '2026-11-16T10:00:00.000Z',
      },
    });
    expect(health.failing).toBe(1);
  });

  it('reports a healthy rule with its last run counts, declines included', () => {
    const state: AutomatedResolutionState = {
      version: 3,
      rules: {
        windows_sid_bridge: {
          lastProcessedTimestamp: '2026-11-16T09:00:00.000Z',
          lastRun: {
            resolutionsCreated: 3,
            skippedAmbiguousBuckets: 1,
            skippedOversizedBuckets: 2,
            skippedNoopBuckets: 5,
          },
        },
      },
    };
    const health = summarizeRulesHealth(effectiveRules(), state);
    expect(statusOf(health, 'windows_sid_bridge')).toMatchObject({
      status: 'healthy',
      last_run: {
        links_created: 3,
        skipped_ambiguous: 1,
        skipped_oversized: 2,
        skipped_noop: 5,
      },
      last_processed_timestamp: '2026-11-16T09:00:00.000Z',
    });
    expect(health.failing).toBe(0);
  });

  it('does not report a switched-off rule as failing even with an old failure saved', () => {
    const state: AutomatedResolutionState = {
      version: 3,
      rules: {
        crowdstrike_sid_bridge: {
          lastProcessedTimestamp: null,
          lastRun: null,
          consecutiveFailures: 2,
          lastError: 'x',
        },
      },
    };
    const health = summarizeRulesHealth(effectiveRules(), state);
    expect(statusOf(health, 'crowdstrike_sid_bridge')?.status).toBe('off');
    expect(health.failing).toBe(0);
  });

  it('reads a differently shaped lastRun without throwing', () => {
    const state: AutomatedResolutionState = {
      version: 3,
      rules: {
        email_exact_match: {
          lastProcessedTimestamp: null,
          lastRun: { linksCreated: 7, skippedAmbiguous: 2 },
        },
      },
    };
    const health = summarizeRulesHealth(effectiveRules(), state);
    expect(statusOf(health, 'email_exact_match')?.last_run).toMatchObject({
      links_created: 7,
      skipped_ambiguous: 2,
      skipped_oversized: 0,
    });
  });
});
