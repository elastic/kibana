/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertEventSchema, buildRuleEventDocument } from './alert_events';

describe('buildRuleEventDocument', () => {
  const baseParams = {
    '@timestamp': '2025-01-01T00:00:00.000Z',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'group-1',
    data: { 'host.name': 'host-a' },
    status: 'breached' as const,
    source: 'internal',
    type: 'signal' as const,
    space_id: 'default',
  };

  it('builds a rule event document with only the required fields', () => {
    expect(buildRuleEventDocument(baseParams)).toEqual({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      rule: { id: 'rule-1', version: 1 },
      group_hash: 'group-1',
      data: { 'host.name': 'host-a' },
      status: 'breached',
      source: 'internal',
      type: 'signal',
      space_id: 'default',
    });
  });

  it('passes scheduled_timestamp through when provided', () => {
    expect(buildRuleEventDocument(baseParams)).not.toHaveProperty('scheduled_timestamp');

    expect(
      buildRuleEventDocument({ ...baseParams, scheduled_timestamp: '2024-12-31T23:59:00.000Z' })
        .scheduled_timestamp
    ).toBe('2024-12-31T23:59:00.000Z');
  });

  it('includes episode only when provided', () => {
    expect(buildRuleEventDocument(baseParams)).not.toHaveProperty('alert');

    const alert = buildRuleEventDocument({
      ...baseParams,
      type: 'alert',
      status: 'recovered',
      alert: { id: 'episode-1', status: 'inactive' },
    }).alert;

    expect(alert).toEqual({ id: 'episode-1', status: 'inactive' });
    expect(alert).not.toHaveProperty('status_count');
  });

  it('includes alert.status_count only when the alert status_count is provided', () => {
    expect(
      buildRuleEventDocument({
        ...baseParams,
        type: 'alert',
        alert: { id: 'episode-1', status: 'pending', status_count: 2 },
      }).alert
    ).toEqual({ id: 'episode-1', status: 'pending', status_count: 2 });
  });

  it('passes severity through when provided', () => {
    expect(buildRuleEventDocument(baseParams)).not.toHaveProperty('severity');

    expect(buildRuleEventDocument({ ...baseParams, severity: 'high' }).severity).toBe('high');
  });
});

describe('alertEventSchema', () => {
  it('validates an external event document with no rule and a vendor source', () => {
    const externalEvent = {
      '@timestamp': '2026-07-01T12:00:00.000Z',
      group_hash: 'pd-group-hash',
      data: { 'pd.incident.id': 'PD-123' },
      status: 'breached' as const,
      source: 'pagerduty',
      type: 'alert' as const,
      space_id: 'default',
      alert: { id: 'pd-episode-1', status: 'active' as const },
    };

    const result = alertEventSchema.safeParse(externalEvent);
    expect(result.success).toBe(true);
  });

  it('validates an internal event document with a rule object', () => {
    const internalEvent = {
      '@timestamp': '2026-07-01T12:00:00.000Z',
      rule: { id: 'rule-1', version: 3 },
      group_hash: 'rule-group-hash',
      data: {},
      status: 'breached' as const,
      source: 'internal',
      type: 'alert' as const,
      space_id: 'default',
    };

    const result = alertEventSchema.safeParse(internalEvent);
    expect(result.success).toBe(true);
  });
});
