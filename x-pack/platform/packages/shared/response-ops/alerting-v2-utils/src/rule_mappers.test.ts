/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { buildRulePayload } from './rule_mappers';

describe('buildRulePayload', () => {
  const minimalData: Partial<RuleAttachmentData> = {
    kind: 'signal',
    metadata: { name: 'Host CPU high', version: 1 },
    schedule: { every: '5m' },
    query: { base: 'FROM logs-*' },
  };

  const minimalAlertData: Partial<RuleAttachmentData> = { ...minimalData, kind: 'alert' };

  it('fills required defaults for minimal data', () => {
    const result = buildRulePayload(minimalData);

    expect(result).toEqual({
      kind: 'signal',
      metadata: { name: 'Host CPU high', version: 1 },
      schedule: { every: '5m' },
      query: { base: 'FROM logs-*' },
      state_transition: null,
      time_field: DEFAULT_TIME_FIELD,
    });
  });

  it('uses provided time_field over the default', () => {
    const result = buildRulePayload({ ...minimalData, time_field: 'event.created' });

    expect(result.time_field).toBe('event.created');
  });

  it('passes through state_transition when provided', () => {
    const result = buildRulePayload({
      ...minimalData,
      state_transition: { pending: { count: 3, timeframe: '5m' } },
    });

    expect(result.state_transition).toEqual({ pending: { count: 3, timeframe: '5m' } });
  });

  it('includes optional fields only when present in data', () => {
    const result = buildRulePayload({
      ...minimalAlertData,
      recovery: { strategy: 'manual' },
      grouping: { fields: ['host.name'] },
    });

    expect(result).toHaveProperty('recovery', { strategy: 'manual' });
    expect(result).toHaveProperty('grouping', { fields: ['host.name'] });
    expect(result).not.toHaveProperty('artifacts');
  });

  it('passes through no_data when provided', () => {
    const result = buildRulePayload({
      ...minimalAlertData,
      no_data: { strategy: 'keep_last', query: 'FROM heartbeat-*' },
    });

    expect(result).toHaveProperty('no_data', {
      strategy: 'keep_last',
      query: 'FROM heartbeat-*',
    });
  });

  it('picks a lifecycle for an alert rule that has none', () => {
    const result = buildRulePayload(minimalAlertData);

    expect(result).toHaveProperty('recovery', { strategy: 'no_breach' });
    expect(result).toHaveProperty('no_data', { strategy: 'ignore' });
  });

  it('omits optional fields when they are undefined in data', () => {
    const result = buildRulePayload(minimalData);

    expect(result).not.toHaveProperty('recovery');
    expect(result).not.toHaveProperty('no_data');
    expect(result).not.toHaveProperty('grouping');
    expect(result).not.toHaveProperty('artifacts');
  });

  it('drops the lifecycle from a signal rule that carries one', () => {
    const result = buildRulePayload({
      ...minimalData,
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
    });

    expect(result).not.toHaveProperty('recovery');
    expect(result).not.toHaveProperty('no_data');
  });
});
