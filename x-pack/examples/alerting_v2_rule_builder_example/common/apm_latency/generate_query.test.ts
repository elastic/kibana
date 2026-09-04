/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateApmLatencyQuery } from './generate_query';
import { apmLatencyBuilderFieldsSchema } from './schema';
import type { ApmLatencyBuilderFields } from './types';

const fields = (overrides: Partial<ApmLatencyBuilderFields> = {}): ApmLatencyBuilderFields => ({
  index: 'traces-apm*',
  timeField: '@timestamp',
  serviceName: 'checkout',
  percentile: 95,
  thresholdMs: 500,
  groupByTransactionName: false,
  ...overrides,
});

const getComposed = (input: ApmLatencyBuilderFields) => {
  const { query } = generateApmLatencyQuery(input);
  if (query.format !== 'composed') {
    throw new Error('Expected a composed query');
  }
  return query;
};

describe('generateApmLatencyQuery', () => {
  it('measures the chosen percentile of the chosen service, in milliseconds', () => {
    const { base, breach, recovery } = getComposed(fields());

    expect(base).toMatchInlineSnapshot(`
      "FROM traces-apm*
        | WHERE service.name == \\"checkout\\"
        | STATS latency_ms = PERCENTILE(transaction.duration.us, 95) / 1000 BY service.name"
    `);
    expect(breach?.segment).toBe('| WHERE latency_ms > 500.0');
    expect(recovery?.segment).toBe('| WHERE latency_ms <= 500.0');
  });

  it('narrows to an environment and transaction type when given', () => {
    const { base } = getComposed(fields({ environment: 'production', transactionType: 'request' }));

    expect(base).toContain('service.environment == "production"');
    expect(base).toContain('transaction.type == "request"');
  });

  it('groups by transaction name when alerting per endpoint', () => {
    const input = fields({ groupByTransactionName: true });
    const { base } = getComposed(input);

    expect(base).toContain('BY service.name, transaction.name');
    expect(generateApmLatencyQuery(input).grouping).toEqual({
      fields: ['service.name', 'transaction.name'],
    });
  });

  it('reports the time field the lookback window filters on', () => {
    expect(generateApmLatencyQuery(fields()).time_field).toBe('@timestamp');
  });

  it('uses a custom recovery threshold when provided', () => {
    const { recovery } = getComposed(fields({ recoveryThresholdMs: 400 }));
    expect(recovery?.segment).toBe('| WHERE latency_ms <= 400.0');
  });

  it('falls back to breach threshold for recovery when none is set', () => {
    const { recovery } = getComposed(fields({ thresholdMs: 750 }));
    expect(recovery?.segment).toBe('| WHERE latency_ms <= 750.0');
  });

  it('generates a query the rule API accepts for every schema-valid input', () => {
    // The generator is only ever called with validated fields, so the two must
    // agree on what "valid" means.
    const inputs = [
      fields(),
      fields({ percentile: 50, thresholdMs: 1 }),
      fields({
        environment: 'staging',
        transactionType: 'page-load',
        groupByTransactionName: true,
      }),
    ];

    for (const input of inputs) {
      expect(apmLatencyBuilderFieldsSchema.safeParse(input).success).toBe(true);
      expect(() => generateApmLatencyQuery(input)).not.toThrow();
    }
  });
});
