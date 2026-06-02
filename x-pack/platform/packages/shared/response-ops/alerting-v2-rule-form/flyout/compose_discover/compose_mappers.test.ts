/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { ComposeFormValues } from './compose_form_types';
import {
  transformQueryIn,
  transformQueryOut,
  composeFormToCreateRequest,
  composeFormToUpdateRequest,
  mapRuleToComposeFormValues,
} from './compose_mappers';

// ── fixtures ─────────────────────────────────────────────────────────────────

const QUERY_WITH_STATS_AND_WHERE =
  'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count > 100';
const BASE = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_BLOCK = '| WHERE count > 100';
const RECOVERY_WITH_STATS_AND_WHERE =
  'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count < 100';
const RECOVERY_BLOCK = '| WHERE count < 100';

const baseRuleResponse: RuleResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule', owner: 'test-owner', tags: ['tag1'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '2m' },
  evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
  createdBy: 'test',
  createdAt: '2026-01-01T00:00:00Z',
  updatedBy: 'test',
  updatedAt: '2026-01-01T00:00:00Z',
} as RuleResponse;

const baseFormValues: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: 'Test Rule', enabled: true, owner: 'test-owner', tags: ['tag1'] },
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '2m' },
  query: {
    format: 'composed',
    base: BASE,
    blocks: { breach: ALERT_BLOCK },
  },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

// ── transformQueryIn ─────────────────────────────────────────────────────────

describe('transformQueryIn', () => {
  it('returns standalone for signal rules', () => {
    const result = transformQueryIn({
      kind: 'signal',
      evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
    });
    expect(result).toEqual({ format: 'standalone', breach: 'FROM logs-* | LIMIT 10' });
  });

  it('ignores recovery_policy for signal rules', () => {
    const result = transformQueryIn({
      kind: 'signal',
      evaluation: { query: { base: 'FROM logs-*' } },
      recovery_policy: { type: 'query', query: { base: 'FROM logs-* | WHERE ok = true' } },
    });
    expect(result).toEqual({ format: 'standalone', breach: 'FROM logs-*' });
  });

  it('splits alert rule with STATS + WHERE into composed format', () => {
    const result = transformQueryIn({
      kind: 'alert',
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
    });
    expect(result).toEqual({
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK },
    });
  });

  it('handles alert rule with STATS but no WHERE', () => {
    const result = transformQueryIn({
      kind: 'alert',
      evaluation: { query: { base: BASE } },
    });
    expect(result.format).toBe('composed');
    expect(result).toHaveProperty('base', BASE);
    if (result.format === 'composed') {
      expect(result.blocks.breach).toBe('');
    }
  });

  it('extracts recovery block from recovery_policy query', () => {
    const result = transformQueryIn({
      kind: 'alert',
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
      recovery_policy: { type: 'query', query: { base: RECOVERY_WITH_STATS_AND_WHERE } },
    });
    expect(result.format).toBe('composed');
    if (result.format === 'composed') {
      expect(result.blocks.recover).toBe(RECOVERY_BLOCK);
    }
  });

  it('omits recover for recovery_policy type no_breach', () => {
    const result = transformQueryIn({
      kind: 'alert',
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
      recovery_policy: { type: 'no_breach' },
    });
    expect(result.format).toBe('composed');
    if (result.format === 'composed') {
      expect(result.blocks.recover).toBeUndefined();
    }
  });

  it('omits recover when recovery_policy is null', () => {
    const result = transformQueryIn({
      kind: 'alert',
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
      recovery_policy: null,
    });
    if (result.format === 'composed') {
      expect(result.blocks.recover).toBeUndefined();
    }
  });

  it('omits recover when recovery_policy is absent', () => {
    const result = transformQueryIn({
      kind: 'alert',
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
    });
    if (result.format === 'composed') {
      expect(result.blocks.recover).toBeUndefined();
    }
  });
});

// ── transformQueryOut ────────────────────────────────────────────────────────

describe('transformQueryOut', () => {
  it('returns evaluation only for standalone signal with no recovery', () => {
    const result = transformQueryOut({ format: 'standalone', breach: 'FROM logs-*' }, 'signal');
    expect(result).toEqual({ evaluation: { query: { base: 'FROM logs-*' } } });
    expect(result.recovery_policy).toBeUndefined();
  });

  it('returns no_breach recovery for standalone alert with no recovery', () => {
    const result = transformQueryOut({ format: 'standalone', breach: 'FROM logs-*' }, 'alert');
    expect(result.evaluation).toEqual({ query: { base: 'FROM logs-*' } });
    expect(result.recovery_policy).toEqual({ type: 'no_breach' });
  });

  it('returns query recovery for standalone with recover string', () => {
    const result = transformQueryOut(
      { format: 'standalone', breach: 'FROM logs-*', recover: 'FROM logs-* | WHERE ok' },
      'alert'
    );
    expect(result.recovery_policy).toEqual({
      type: 'query',
      query: { base: 'FROM logs-* | WHERE ok' },
    });
  });

  it('joins base + breach for composed evaluation', () => {
    const result = transformQueryOut({
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK },
    });
    expect(result.evaluation.query.base).toBe(`${BASE}\n${ALERT_BLOCK}`);
  });

  it('returns no_breach when composed has no recover block', () => {
    const result = transformQueryOut({
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK },
    });
    expect(result.recovery_policy).toEqual({ type: 'no_breach' });
  });

  it('joins base + recover for composed recovery', () => {
    const result = transformQueryOut({
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK, recover: RECOVERY_BLOCK },
    });
    expect(result.recovery_policy).toEqual({
      type: 'query',
      query: { base: `${BASE}\n${RECOVERY_BLOCK}` },
    });
  });

  it('handles composed with empty base', () => {
    const result = transformQueryOut({
      format: 'composed',
      base: '',
      blocks: { breach: ALERT_BLOCK, recover: RECOVERY_BLOCK },
    });
    expect(result.evaluation.query.base).toBe(ALERT_BLOCK);
    expect(result.recovery_policy).toEqual({
      type: 'query',
      query: { base: RECOVERY_BLOCK },
    });
  });

  it('treats whitespace-only recover as absent', () => {
    const result = transformQueryOut({
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK, recover: '   ' },
    });
    expect(result.recovery_policy).toEqual({ type: 'no_breach' });
  });
});

// ── round-trip ───────────────────────────────────────────────────────────────

describe('transformQueryIn → transformQueryOut round-trip', () => {
  it('round-trips a signal rule', () => {
    const original = { kind: 'signal' as const, evaluation: { query: { base: 'FROM logs-*' } } };
    const query = transformQueryIn(original);
    const out = transformQueryOut(query, 'signal');
    expect(out.evaluation.query.base).toBe(original.evaluation.query.base);
    expect(out.recovery_policy).toBeUndefined();
  });

  it('round-trips an alert rule with recovery', () => {
    const original = {
      kind: 'alert' as const,
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
      recovery_policy: { type: 'query', query: { base: RECOVERY_WITH_STATS_AND_WHERE } },
    };
    const query = transformQueryIn(original);
    const out = transformQueryOut(query, 'alert');
    expect(out.evaluation.query.base).toBe(QUERY_WITH_STATS_AND_WHERE);
    expect(out.recovery_policy).toEqual({
      type: 'query',
      query: { base: RECOVERY_WITH_STATS_AND_WHERE },
    });
  });

  it('round-trips an alert rule without recovery', () => {
    const original = {
      kind: 'alert' as const,
      evaluation: { query: { base: QUERY_WITH_STATS_AND_WHERE } },
      recovery_policy: { type: 'no_breach' },
    };
    const query = transformQueryIn(original);
    const out = transformQueryOut(query, 'alert');
    expect(out.evaluation.query.base).toBe(QUERY_WITH_STATS_AND_WHERE);
    expect(out.recovery_policy).toEqual({ type: 'no_breach' });
  });
});

// ── composeFormToCreateRequest ───────────────────────────────────────────────

describe('composeFormToCreateRequest', () => {
  it('maps basic form values to create request', () => {
    const result = composeFormToCreateRequest(baseFormValues);
    expect(result.kind).toBe('alert');
    expect(result.metadata).toEqual({ name: 'Test Rule', owner: 'test-owner', tags: ['tag1'] });
    expect(result.time_field).toBe('@timestamp');
    expect(result.schedule).toEqual({ every: '5m', lookback: '2m' });
    expect(result.evaluation.query.base).toBe(`${BASE}\n${ALERT_BLOCK}`);
    expect(result.recovery_policy).toEqual({ type: 'no_breach' });
  });

  it('omits tags when empty', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      metadata: { ...baseFormValues.metadata, tags: [] },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.metadata.tags).toBeUndefined();
  });

  it('maps grouping when present', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      grouping: { fields: ['host.name'] },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.grouping).toEqual({ fields: ['host.name'] });
  });

  it('omits grouping when fields are empty', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      grouping: { fields: [] },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.grouping).toBeUndefined();
  });

  it('returns undefined state_transition for signal rules', () => {
    const values: ComposeFormValues = { ...baseFormValues, kind: 'signal' };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toBeUndefined();
  });

  it('maps state_transition for immediate delay mode', () => {
    const result = composeFormToCreateRequest(baseFormValues);
    expect(result.state_transition).toEqual({ pending_count: 0, recovering_count: 0 });
  });

  it('maps state_transition for breaches delay mode', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      stateTransitionAlertDelayMode: 'breaches',
      stateTransition: { pendingCount: 5 },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual(expect.objectContaining({ pending_count: 5 }));
  });

  it('maps state_transition for duration delay mode', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      stateTransitionAlertDelayMode: 'duration',
      stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual(
      expect.objectContaining({ pending_count: 3, pending_timeframe: '10m' })
    );
  });

  it('trims runbook and dashboard artifacts', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      runbookArtifacts: [
        { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, value: '  Runbook steps  ' },
      ],
      dashboardArtifacts: [
        { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: '  dashboard-123  ' },
      ],
    };

    const result = composeFormToCreateRequest(values);

    expect(result.artifacts).toEqual([
      { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, value: 'Runbook steps' },
      { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: 'dashboard-123' },
    ]);
  });

  it('removes empty runbook and dashboard artifacts while preserving other artifacts', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      runbookArtifacts: [{ id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, value: '   ' }],
      dashboardArtifacts: [{ id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: '' }],
      artifacts: [{ id: 'other-id', type: 'other', value: 'kept' }],
    };

    const result = composeFormToCreateRequest(values);

    expect(result.artifacts).toEqual([{ id: 'other-id', type: 'other', value: 'kept' }]);
  });

  it('generates missing IDs for runbook and dashboard artifacts', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      runbookArtifacts: [{ id: '', type: RUNBOOK_ARTIFACT_TYPE, value: 'Runbook steps' }],
      dashboardArtifacts: [{ id: '', type: DASHBOARD_ARTIFACT_TYPE, value: 'dashboard-123' }],
    };

    const result = composeFormToCreateRequest(values);

    expect(result.artifacts).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^runbook-/),
        type: RUNBOOK_ARTIFACT_TYPE,
        value: 'Runbook steps',
      }),
      expect.objectContaining({
        id: expect.stringMatching(/^dashboard-/),
        type: DASHBOARD_ARTIFACT_TYPE,
        value: 'dashboard-123',
      }),
    ]);
  });
});

// ── composeFormToUpdateRequest ───────────────────────────────────────────────

describe('composeFormToUpdateRequest', () => {
  it('excludes kind from update request', () => {
    const result = composeFormToUpdateRequest(baseFormValues);
    expect(result).not.toHaveProperty('kind');
  });

  it('nullifies optional fields when absent', () => {
    const result = composeFormToUpdateRequest(baseFormValues);
    expect(result.grouping).toBeNull();
    expect(result.artifacts).toBeNull();
  });

  it('preserves grouping when present', () => {
    const values: ComposeFormValues = {
      ...baseFormValues,
      grouping: { fields: ['host.name'] },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.grouping).toEqual({ fields: ['host.name'] });
  });
});

// ── mapRuleToComposeFormValues ───────────────────────────────────────────────

describe('mapRuleToComposeFormValues', () => {
  it('maps basic required fields', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.kind).toBe('alert');
    expect(result.timeField).toBe('@timestamp');
    expect(result.metadata).toEqual({
      name: 'Test Rule',
      enabled: true,
      owner: 'test-owner',
      tags: ['tag1'],
    });
    expect(result.stateTransitionAlertDelayMode).toBe('immediate');
    expect(result.stateTransitionRecoveryDelayMode).toBe('immediate');
  });

  it('maps schedule with lookback', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.schedule).toEqual({ every: '5m', lookback: '2m' });
  });

  it('defaults lookback to 1m when absent', () => {
    const rule = { ...baseRuleResponse, schedule: { every: '10m' } } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.schedule.lookback).toBe('1m');
  });

  it('produces a composed query from evaluation', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.query.format).toBe('composed');
    if (result.query.format === 'composed') {
      expect(result.query.base).toBe(BASE);
      expect(result.query.blocks.breach).toBe(ALERT_BLOCK);
    }
  });

  it('extracts recovery block when recovery_policy is query type', () => {
    const rule = {
      ...baseRuleResponse,
      recovery_policy: { type: 'query', query: { base: RECOVERY_WITH_STATS_AND_WHERE } },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    if (result.query.format === 'composed') {
      expect(result.query.blocks.recover).toBe(RECOVERY_BLOCK);
    }
  });

  it('omits recover for no_breach recovery', () => {
    const rule = {
      ...baseRuleResponse,
      recovery_policy: { type: 'no_breach' },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    if (result.query.format === 'composed') {
      expect(result.query.blocks.recover).toBeUndefined();
    }
  });

  it('maps grouping when present', () => {
    const rule = {
      ...baseRuleResponse,
      grouping: { fields: ['host.name'] },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.grouping).toEqual({ fields: ['host.name'] });
  });

  it('omits grouping when absent', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.grouping).toBeUndefined();
  });

  it('maps state_transition and derives delay modes', () => {
    const rule = {
      ...baseRuleResponse,
      state_transition: { pending_count: 3, pending_timeframe: '10m' },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.stateTransition).toEqual({
      pendingCount: 3,
      pendingTimeframe: '10m',
      recoveringCount: null,
      recoveringTimeframe: null,
    });
    expect(result.stateTransitionAlertDelayMode).toBe('duration');
    expect(result.stateTransitionRecoveryDelayMode).toBe('immediate');
  });

  it('sets stateTransition to undefined when absent from response', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.stateTransition).toBeUndefined();
  });

  it('splits artifacts by field ownership when present', () => {
    const rule = {
      ...baseRuleResponse,
      artifacts: [
        { id: 'host-id', type: 'host', value: 'host-a' },
        { id: 'runbook-id', type: 'runbook', value: 'steps here' },
        { id: 'dashboard-id', type: 'dashboard', value: 'dashboard-123' },
      ],
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.artifacts).toEqual([{ id: 'host-id', type: 'host', value: 'host-a' }]);
    expect(result.runbookArtifacts).toEqual([
      { id: 'runbook-id', type: 'runbook', value: 'steps here' },
    ]);
    expect(result.dashboardArtifacts).toEqual([
      { id: 'dashboard-id', type: 'dashboard', value: 'dashboard-123' },
    ]);
  });

  it('derives recoveries delay mode from recovering_count', () => {
    const rule = {
      ...baseRuleResponse,
      state_transition: { recovering_count: 5 },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.stateTransitionRecoveryDelayMode).toBe('recoveries');
  });
});
