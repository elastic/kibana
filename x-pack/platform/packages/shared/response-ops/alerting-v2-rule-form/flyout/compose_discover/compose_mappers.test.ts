/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { ComposeFormValues } from './compose_form_types';
import {
  composeFormToCreateRequest,
  composeFormToUpdateRequest,
  mapRuleToComposeFormValues,
} from './compose_mappers';

// ── fixtures ─────────────────────────────────────────────────────────────────

const BASE = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_BLOCK = '| WHERE count > 100';
const RECOVERY_BLOCK = '| WHERE count < 100';

const baseRuleResponse: RuleResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule', owner: 'test-owner', tags: ['tag1'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '2m' },
  query: { format: 'composed', base: BASE, blocks: { breach: ALERT_BLOCK } },
  createdBy: 'test',
  createdAt: '2026-01-01T00:00:00Z',
  updatedBy: 'test',
  updatedAt: '2026-01-01T00:00:00Z',
};

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

// ── composeFormToCreateRequest ───────────────────────────────────────────────

describe('composeFormToCreateRequest', () => {
  it('maps basic form values to create request', () => {
    const result = composeFormToCreateRequest(baseFormValues);
    expect(result.kind).toBe('alert');
    expect(result.metadata).toEqual({ name: 'Test Rule', owner: 'test-owner', tags: ['tag1'] });
    expect(result.time_field).toBe('@timestamp');
    expect(result.schedule).toEqual({ every: '5m', lookback: '2m' });
    expect(result.query).toEqual({
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK },
    });
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

  it('maps composed query from rule response', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.query.format).toBe('composed');
    if (result.query.format === 'composed') {
      expect(result.query.base).toBe(BASE);
      expect(result.query.blocks.breach).toBe(ALERT_BLOCK);
    }
  });

  it('maps recover block from composed query', () => {
    const rule = {
      ...baseRuleResponse,
      query: {
        format: 'composed',
        base: BASE,
        blocks: { breach: ALERT_BLOCK, recover: RECOVERY_BLOCK },
      },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    if (result.query.format === 'composed') {
      expect(result.query.blocks.recover).toBe(RECOVERY_BLOCK);
    }
  });

  it('omits recover block when not in query', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    if (result.query.format === 'composed') {
      expect(result.query.blocks.recover).toBeUndefined();
    }
  });

  it('maps standalone query from rule response', () => {
    const rule = {
      ...baseRuleResponse,
      query: { format: 'standalone', breach: 'FROM logs-* | LIMIT 10' },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.query).toEqual({ format: 'standalone', breach: 'FROM logs-* | LIMIT 10' });
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

  it('maps artifacts when present', () => {
    const rule = {
      ...baseRuleResponse,
      artifacts: [{ id: 'a1', type: 'runbook', value: 'steps here' }],
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.artifacts).toEqual([{ id: 'a1', type: 'runbook', value: 'steps here' }]);
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
