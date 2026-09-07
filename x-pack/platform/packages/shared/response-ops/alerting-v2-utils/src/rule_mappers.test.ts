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
    query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
  };

  it('fills required defaults for minimal data', () => {
    const result = buildRulePayload(minimalData);

    expect(result).toEqual({
      kind: 'signal',
      metadata: { name: 'Host CPU high', version: 1 },
      schedule: { every: '5m' },
      query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
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
      state_transition: { pending_count: 3, pending_timeframe: '5m' },
    });

    expect(result.state_transition).toEqual({ pending_count: 3, pending_timeframe: '5m' });
  });

  it('includes optional fields only when present in data', () => {
    const result = buildRulePayload({
      ...minimalData,
      recovery_strategy: 'no_breach',
      grouping: { fields: ['host.name'] },
    });

    expect(result).toHaveProperty('recovery_strategy', 'no_breach');
    expect(result).toHaveProperty('grouping', { fields: ['host.name'] });
    expect(result).not.toHaveProperty('no_data_strategy');
    expect(result).not.toHaveProperty('artifacts');
  });

  it('omits optional fields when they are undefined in data', () => {
    const result = buildRulePayload(minimalData);

    expect(result).not.toHaveProperty('recovery_strategy');
    expect(result).not.toHaveProperty('no_data_strategy');
    expect(result).not.toHaveProperty('grouping');
    expect(result).not.toHaveProperty('artifacts');
  });
});
