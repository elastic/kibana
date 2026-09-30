/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { FormValues } from '../../form/types';
import {
  composeFormToCreateRequest,
  composeFormToUpdateRequest,
  mapRuleToComposeFormValues,
  mapYamlFormValuesToComposeFormValues,
} from './compose_mappers';

// ── fixtures ─────────────────────────────────────────────────────────────────

const BASE = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_SEGMENT = 'WHERE count > 100';
const RECOVERY_SEGMENT = 'WHERE count < 100';

const baseRuleResponse: RuleResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule', version: 1, tags: ['tag1'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '2m' },
  query: {
    base: BASE,
    breach: { segment: ALERT_SEGMENT },
  },
  created_by: { profile_uid: 'test' },
  created_at: '2026-01-01T00:00:00Z',
  updated_by: { profile_uid: 'test' },
  updated_at: '2026-01-01T00:00:00Z',
};

const baseFormValues: FormValues = {
  kind: 'alert',
  metadata: { name: 'Test Rule', enabled: true, tags: ['tag1'] },
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '2m' },
  query: {
    base: BASE,
    breach: { segment: ALERT_SEGMENT },
  },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

// ── composeFormToCreateRequest ───────────────────────────────────────────────

describe('composeFormToCreateRequest', () => {
  it('maps basic form values to create request', () => {
    const result = composeFormToCreateRequest(baseFormValues);
    expect(result.kind).toBe('alert');
    expect(result.metadata).toEqual({ name: 'Test Rule', tags: ['tag1'] });
    expect(result.time_field).toBe('@timestamp');
    expect(result.schedule).toEqual({ every: '5m', lookback: '2m' });
    expect(result.query).toEqual({
      base: BASE,
      breach: { segment: ALERT_SEGMENT },
    });
  });

  it('includes the condition recovery block when the form has a recovery segment', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.condition, segment: RECOVERY_SEGMENT },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.query).toEqual({
      base: BASE,
      breach: { segment: ALERT_SEGMENT },
    });
    expect(result.recovery).toEqual({
      strategy: 'condition',
      segment: RECOVERY_SEGMENT,
    });
  });

  it('falls back to no_breach when the form has no recovery', () => {
    const result = composeFormToCreateRequest(baseFormValues);
    expect(result.query).not.toHaveProperty('recovery');
    expect(result.recovery).toEqual({ strategy: 'no_breach' });
  });

  it('drops the breach block when the segment is blank', () => {
    const values: FormValues = {
      ...baseFormValues,
      query: { base: 'FROM logs-* | WHERE count > 100', breach: { segment: '' } },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.query).toEqual({ base: 'FROM logs-* | WHERE count > 100' });
  });

  it('omits tags when empty', () => {
    const values: FormValues = {
      ...baseFormValues,
      metadata: { ...baseFormValues.metadata, tags: [] },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.metadata.tags).toBeUndefined();
  });

  it('maps grouping when present', () => {
    const values: FormValues = {
      ...baseFormValues,
      grouping: { fields: ['host.name'] },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.grouping).toEqual({ fields: ['host.name'] });
  });

  it('omits grouping when fields are empty', () => {
    const values: FormValues = {
      ...baseFormValues,
      grouping: { fields: [] },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.grouping).toBeUndefined();
  });

  it('includes no_data when set on alert rule', () => {
    const values: FormValues = {
      ...baseFormValues,
      noData: { strategy: noDataStrategy.resolve },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.no_data).toEqual({ strategy: 'resolve' });
  });

  it('falls back to the ignore strategy when no_data is undefined', () => {
    const result = composeFormToCreateRequest(baseFormValues);
    expect(result.no_data).toEqual({ strategy: 'ignore' });
  });

  it('omits recovery and no_data for signal rules even when set', () => {
    const values: FormValues = {
      ...baseFormValues,
      kind: 'signal',
      recovery: { strategy: recoveryStrategy.no_breach },
      noData: { strategy: noDataStrategy.resolve },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.recovery).toBeUndefined();
    expect(result.no_data).toBeUndefined();
  });

  it('returns undefined state_transition for signal rules', () => {
    const values: FormValues = { ...baseFormValues, kind: 'signal' };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toBeUndefined();
  });

  it('maps state_transition for immediate delay mode (recovery disabled omits recovering)', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.manual },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual({ pending: { count: 0 } });
  });

  it('emits recovering count 0 for immediate delay mode when recovery is enabled', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.no_breach },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual({
      pending: { count: 0 },
      recovering: { count: 0 },
    });
  });

  it('omits the recovering block for recovery.strategy: manual even if recovering values are set', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.manual },
      stateTransitionRecoveryDelayMode: 'recoveries',
      stateTransition: { recoveringCount: 3 },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual({ pending: { count: 0 } });
  });

  it('maps state_transition for breaches delay mode', () => {
    const values: FormValues = {
      ...baseFormValues,
      stateTransitionAlertDelayMode: 'breaches',
      stateTransition: { pendingCount: 5 },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual(expect.objectContaining({ pending: { count: 5 } }));
  });

  it('maps state_transition for duration delay mode', () => {
    const values: FormValues = {
      ...baseFormValues,
      stateTransitionAlertDelayMode: 'duration',
      stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
    };
    const result = composeFormToCreateRequest(values);
    expect(result.state_transition).toEqual(
      expect.objectContaining({ pending: { count: 3, timeframe: '10m' } })
    );
  });

  it('passes runbook and dashboard artifacts through with data unchanged', () => {
    const values: FormValues = {
      ...baseFormValues,
      runbookArtifacts: [
        {
          id: 'runbook-id',
          type: RUNBOOK_ARTIFACT_TYPE,
          data: { content: '  Runbook steps  ' },
        },
      ],
      dashboardArtifacts: [
        {
          id: 'dashboard-id',
          type: DASHBOARD_ARTIFACT_TYPE,
          data: { dashboard_id: '  dashboard-123  ' },
        },
      ],
    };

    const result = composeFormToCreateRequest(values);

    expect(result.artifacts).toEqual([
      {
        id: 'runbook-id',
        type: RUNBOOK_ARTIFACT_TYPE,
        data: { content: '  Runbook steps  ' },
      },
      {
        id: 'dashboard-id',
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboard_id: '  dashboard-123  ' },
      },
    ]);
  });

  it('passes empty-looking runbook and dashboard artifacts through without filtering', () => {
    const values: FormValues = {
      ...baseFormValues,
      runbookArtifacts: [
        { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '   ' } },
      ],
      dashboardArtifacts: [
        { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: '' } },
      ],
      artifacts: [{ id: 'other-id', type: 'other', data: { value: 'kept' } }],
    };

    const result = composeFormToCreateRequest(values);

    expect(result.artifacts).toEqual([
      { id: 'other-id', type: 'other', data: { value: 'kept' } },
      { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '   ' } },
      { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: '' } },
    ]);
  });

  it('passes empty artifact ids through without generating replacements', () => {
    const values: FormValues = {
      ...baseFormValues,
      runbookArtifacts: [
        { id: '', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'Runbook steps' } },
      ],
      dashboardArtifacts: [
        { id: '', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: 'dashboard-123' } },
      ],
    };

    const result = composeFormToCreateRequest(values);

    expect(result.artifacts).toEqual([
      { id: '', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'Runbook steps' } },
      { id: '', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboard_id: 'dashboard-123' } },
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

  it('sends the lifecycle rather than nulling it', () => {
    const result = composeFormToUpdateRequest(baseFormValues);
    expect(result.recovery).toEqual({ strategy: 'no_breach' });
    expect(result.no_data).toEqual({ strategy: 'ignore' });
  });

  it('nullifies tags when empty (clear all tags on a partial update)', () => {
    const values: FormValues = {
      ...baseFormValues,
      metadata: { ...baseFormValues.metadata, tags: [] },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.metadata?.tags).toBeNull();
  });

  it('preserves tags when present', () => {
    const values: FormValues = {
      ...baseFormValues,
      metadata: { ...baseFormValues.metadata, tags: ['prod', 'infra'] },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.metadata?.tags).toEqual(['prod', 'infra']);
  });

  it('preserves grouping when present', () => {
    const values: FormValues = {
      ...baseFormValues,
      grouping: { fields: ['host.name'] },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.grouping).toEqual({ fields: ['host.name'] });
  });

  it('preserves recovery and no_data when present', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.no_breach },
      noData: { strategy: noDataStrategy.resolve },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.recovery).toEqual({ strategy: 'no_breach' });
    expect(result.no_data).toEqual({ strategy: 'resolve' });
  });

  it('preserves recovery.strategy: manual', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.manual },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.recovery).toEqual({ strategy: 'manual' });
  });

  it('sends the condition strategy when the user authors a recovery segment', () => {
    const values: FormValues = {
      ...baseFormValues,
      recovery: { strategy: recoveryStrategy.condition, segment: RECOVERY_SEGMENT },
    };
    const result = composeFormToUpdateRequest(values);
    expect(result.recovery).toEqual({ strategy: 'condition', segment: RECOVERY_SEGMENT });
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

  it('maps the query from the rule response', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.query).toEqual({ base: BASE, breach: { segment: ALERT_SEGMENT } });
  });

  it('round-trips an omitted breach through the form as an empty segment', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      query: { base: BASE },
    };

    const formValues = mapRuleToComposeFormValues(rule);

    expect(formValues.query).toEqual({
      base: BASE,
      breach: { segment: '' },
    });
    expect(composeFormToCreateRequest(formValues).query).toEqual({ base: BASE });
  });

  it('widens the condition recovery block into form state', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.condition, segment: RECOVERY_SEGMENT },
    };
    const result = mapRuleToComposeFormValues(rule);
    expect(result.recovery).toEqual({ strategy: 'condition', segment: RECOVERY_SEGMENT });
  });

  it('leaves recovery undefined when absent from the response', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.recovery).toBeUndefined();
  });

  it('widens the no_breach recovery block into form state', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.no_breach },
    };
    const result = mapRuleToComposeFormValues(rule);
    expect(result.recovery).toEqual({ strategy: 'no_breach' });
  });

  it('widens the query recovery block into form state', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.query, query: 'FROM logs-* | WHERE status == "ok"' },
    };
    const result = mapRuleToComposeFormValues(rule);
    expect(result.recovery).toEqual({
      strategy: 'query',
      query: 'FROM logs-* | WHERE status == "ok"',
    });
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
      state_transition: { pending: { count: 3, timeframe: '10m' } },
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
        { id: 'host-id', type: 'host', data: { value: 'host-a' } },
        { id: 'runbook-id', type: 'runbook', data: { content: 'steps here' } },
        { id: 'dashboard-id', type: 'dashboard', data: { dashboard_id: 'dashboard-123' } },
      ],
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.artifacts).toEqual([{ id: 'host-id', type: 'host', data: { value: 'host-a' } }]);
    expect(result.runbookArtifacts).toEqual([
      { id: 'runbook-id', type: 'runbook', data: { content: 'steps here' } },
    ]);
    expect(result.dashboardArtifacts).toEqual([
      { id: 'dashboard-id', type: 'dashboard', data: { dashboard_id: 'dashboard-123' } },
    ]);
  });

  it('widens no_data from the rule response', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      no_data: { strategy: noDataStrategy.resolve },
    };
    const result = mapRuleToComposeFormValues(rule);
    expect(result.noData).toEqual({ strategy: 'resolve' });
  });

  it('leaves noData undefined when absent from the response', () => {
    const result = mapRuleToComposeFormValues(baseRuleResponse);
    expect(result.noData).toBeUndefined();
  });

  it('leaves recovery and noData undefined for signal rules, which cannot carry them', () => {
    const rule: RuleResponse = { ...baseRuleResponse, kind: 'signal' };
    const result = mapRuleToComposeFormValues(rule);
    expect(result.recovery).toBeUndefined();
    expect(result.noData).toBeUndefined();
  });

  it('derives recoveries delay mode from the recovering count', () => {
    const rule = {
      ...baseRuleResponse,
      state_transition: { recovering: { count: 5 } },
    } as RuleResponse;
    const result = mapRuleToComposeFormValues(rule);
    expect(result.stateTransitionRecoveryDelayMode).toBe('recoveries');
  });

  it('carries the no_data presence query into form state', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      no_data: { strategy: noDataStrategy.keep_last, query: 'FROM logs-* | STATS c = COUNT(*)' },
    };
    const result = mapRuleToComposeFormValues(rule);
    expect(result.noData).toEqual({
      strategy: 'keep_last',
      query: 'FROM logs-* | STATS c = COUNT(*)',
    });
  });
});

describe('round-trip: lifecycle fields survive load → save', () => {
  it('preserves recovery.strategy: no_breach through load → save cycle', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.no_breach },
    };
    const formValues = mapRuleToComposeFormValues(rule);
    const request = composeFormToCreateRequest(formValues);
    expect(request.recovery).toEqual({ strategy: 'no_breach' });
  });

  it('preserves recovery.strategy: manual through load → save cycle', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.manual },
    };
    const formValues = mapRuleToComposeFormValues(rule);
    const request = composeFormToCreateRequest(formValues);
    expect(request.recovery).toEqual({ strategy: 'manual' });
  });

  it('preserves no_data through load → save cycle', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      no_data: { strategy: noDataStrategy.keep_last },
    };
    const formValues = mapRuleToComposeFormValues(rule);
    const request = composeFormToCreateRequest(formValues);
    expect(request.no_data).toEqual({ strategy: 'keep_last' });
  });

  it('preserves the no_data presence query through load → save cycle', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.query, query: 'FROM logs-* | WHERE status == "ok"' },
      no_data: { strategy: noDataStrategy.keep_last, query: 'FROM logs-* | STATS c = COUNT(*)' },
      query: { base: 'FROM logs-* | WHERE status == "error"' },
    };
    const formValues = mapRuleToComposeFormValues(rule);
    const request = composeFormToCreateRequest(formValues);
    expect(request.query).toEqual({ base: 'FROM logs-* | WHERE status == "error"' });
    expect(request.recovery).toEqual({
      strategy: 'query',
      query: 'FROM logs-* | WHERE status == "ok"',
    });
    expect(request.no_data).toEqual({
      strategy: 'keep_last',
      query: 'FROM logs-* | STATS c = COUNT(*)',
    });
  });

  it('emits no_breach when the response carries no recovery', () => {
    const formValues = mapRuleToComposeFormValues(baseRuleResponse);
    const request = composeFormToCreateRequest(formValues);
    expect(request.recovery).toEqual({ strategy: 'no_breach' });
  });

  it('preserves recovery.strategy: condition through load → save cycle', () => {
    const rule: RuleResponse = {
      ...baseRuleResponse,
      recovery: { strategy: recoveryStrategy.condition, segment: RECOVERY_SEGMENT },
    };
    const formValues = mapRuleToComposeFormValues(rule);
    const request = composeFormToCreateRequest(formValues);
    expect(request.recovery).toEqual({ strategy: 'condition', segment: RECOVERY_SEGMENT });
  });
});

describe('mapYamlFormValuesToComposeFormValues', () => {
  const parsedYaml: FormValues = {
    kind: 'alert',
    metadata: { name: 'Test', enabled: true, description: '', tags: [] },
    timeField: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    query: {
      base: BASE,
      breach: { segment: `| ${ALERT_SEGMENT}` },
    },
    stateTransitionAlertDelayMode: 'immediate',
    stateTransitionRecoveryDelayMode: 'immediate',
    artifacts: [],
  };

  it('passes through split alert queries', () => {
    const result = mapYamlFormValuesToComposeFormValues(parsedYaml);

    expect(result.query).toEqual(parsedYaml.query);
  });

  it('passes through signal queries that keep everything in base', () => {
    const signalQuery = {
      base: 'FROM logs-* | LIMIT 10',
      breach: { segment: '' },
    };
    const result = mapYamlFormValuesToComposeFormValues({
      ...parsedYaml,
      kind: 'signal',
      query: signalQuery,
    });

    expect(result.query).toEqual(signalQuery);
  });
});
