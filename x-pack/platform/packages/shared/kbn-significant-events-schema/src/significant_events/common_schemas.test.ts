/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantEventBaseSchema, signalEntrySchema } from './common_schemas';
import { MAX_SUMMARY_LENGTH, MAX_SYMPTOM_HYPOTHESIS_LENGTH, MAX_TEXT_LENGTH } from './constants';

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

  it.each([
    ['confirms', { esql_query: 'FROM logs.checkout', result: 'found' }],
    ['refutes', { esql_query: 'FROM logs.checkout', result: 'found' }],
    ['off_topic', { esql_query: 'FROM logs.checkout', result: 'found' }],
    ['inconclusive', { esql_query: 'FROM logs.checkout', result: 'error' }],
    ['not_checked', undefined],
  ] as const)('accepts the %s verdict', (verdict, evidence) => {
    const signal = signalEntrySchema.parse({ ...baseSignal, verdict, evidence });
    expect(signal.verdict).toBe(verdict);
  });

  it('rejects verdicts incompatible with query execution', () => {
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        verdict: 'confirms',
        evidence: { esql_query: 'FROM logs.checkout', result: 'error' },
      }).success
    ).toBe(false);
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        verdict: 'not_checked',
        evidence: { esql_query: 'FROM logs.checkout', result: 'found' },
      }).success
    ).toBe(false);
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        verdict: 'refutes',
        evidence: { esql_query: 'FROM logs.checkout', result: 'empty' },
      }).success
    ).toBe(false);
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        verdict: 'inconclusive',
        evidence: { esql_query: 'FROM logs.checkout', result: 'found' },
      }).success
    ).toBe(false);
  });

  it('does not accept an evidence outcome alias', () => {
    expect(
      signalEntrySchema.safeParse({
        ...baseSignal,
        verdict: 'confirms',
        evidence: {
          esql_query: 'FROM logs.checkout',
          outcome: 'found',
        },
      }).success
    ).toBe(false);
  });
});

describe('significant event narrative fields', () => {
  it('accepts legacy narratives while write tools enforce shorter agent limits', () => {
    expect(
      significantEventBaseSchema.shape.symptom_hypothesis.safeParse(
        'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH)
      ).success
    ).toBe(true);
    expect(
      significantEventBaseSchema.shape.symptom_hypothesis.safeParse(
        'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1)
      ).success
    ).toBe(true);
    expect(
      significantEventBaseSchema.shape.summary.safeParse('x'.repeat(MAX_SUMMARY_LENGTH)).success
    ).toBe(true);
    expect(
      significantEventBaseSchema.shape.summary.safeParse('x'.repeat(MAX_SUMMARY_LENGTH + 1)).success
    ).toBe(true);
    expect(
      significantEventBaseSchema.shape.summary.safeParse('x'.repeat(MAX_TEXT_LENGTH + 1)).success
    ).toBe(false);
  });
});
