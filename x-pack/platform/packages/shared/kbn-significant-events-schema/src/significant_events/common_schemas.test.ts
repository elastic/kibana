/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { signalEntrySchema } from './common_schemas';

describe('signalEntrySchema', () => {
  const baseSignal = {
    type: 'detection' as const,
    stream_name: 'logs.checkout',
    description: 'Payment calls are timing out.',
    metadata: {
      detection_id: 'detection-1',
      rule_uuid: 'rule-1',
      rule_name: 'Payment timeout',
      change_point_type: 'spike',
      p_value: 0.01,
    },
  };

  it.each(['active', 'recovered', 'non_incident', 'inconclusive', 'not_checked'] as const)(
    'accepts the %s verification assessment',
    (assessment) => {
      expect(
        signalEntrySchema.safeParse({
          ...baseSignal,
          verification: {
            assessment,
            lens: 'failure',
            checked_at: '2026-08-04T12:00:00.000Z',
          },
        }).success
      ).toBe(true);
    }
  );

  it('strips legacy confirmed fields from new writes', () => {
    const signal = signalEntrySchema.parse({
      ...baseSignal,
      confirmed: true,
    });
    expect('confirmed' in signal).toBe(false);
  });

  it('accepts a normalized evidence signature', () => {
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        verification: { assessment: 'active', lens: 'failure' },
        evidence: {
          esql_query: 'FROM logs.checkout',
          result: 'found',
          signature: 'payment timeout',
        },
      }).success
    ).toBe(true);
  });

  it('does not accept an evidence outcome alias', () => {
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        evidence: {
          esql_query: 'FROM logs.checkout',
          outcome: 'found',
        },
      }).success
    ).toBe(false);
  });
});
