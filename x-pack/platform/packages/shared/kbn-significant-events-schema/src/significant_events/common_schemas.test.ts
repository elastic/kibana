/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { blastRadiusEntrySchema, causalFeatureSchema, signalEntrySchema } from './common_schemas';

const metadata = {
  detection_id: 'det-1',
  rule_uuid: 'rule-1',
  change_point_type: 'spike' as const,
  p_value: 0.01,
};

const parseSignal = (
  overrides: Record<string, unknown>
): ReturnType<typeof signalEntrySchema.safeParse> =>
  signalEntrySchema.safeParse({
    type: 'detection',
    stream_name: 'logs.test',
    description: 'Found: payment refused. Impact: checkout blocked.',
    collected_at: '2026-07-20T08:00:00.000Z',
    metadata,
    ...overrides,
  });

const evidence = (result: 'found' | 'empty' | 'error') => ({
  esql_query: 'FROM logs.test | LIMIT 1',
  result,
});

describe('signalEntrySchema verdict/evidence consistency', () => {
  it('rejects confirms with empty evidence', () => {
    expect(parseSignal({ verdict: 'confirms', evidence: evidence('empty') }).success).toBe(false);
  });

  it('rejects off_topic with empty evidence', () => {
    expect(parseSignal({ verdict: 'off_topic', evidence: evidence('empty') }).success).toBe(false);
  });

  it('accepts refutes with found evidence', () => {
    expect(parseSignal({ verdict: 'refutes', evidence: evidence('found') }).success).toBe(true);
  });

  it('accepts refutes with empty evidence', () => {
    expect(parseSignal({ verdict: 'refutes', evidence: evidence('empty') }).success).toBe(true);
  });

  it('rejects refutes with error evidence', () => {
    expect(parseSignal({ verdict: 'refutes', evidence: evidence('error') }).success).toBe(false);
  });

  it('rejects refutes when evidence is omitted', () => {
    expect(parseSignal({ verdict: 'refutes' }).success).toBe(false);
  });

  it('rejects refutes when evidence is null', () => {
    expect(parseSignal({ verdict: 'refutes', evidence: null }).success).toBe(false);
  });

  it('accepts inconclusive with found evidence (rate-flat rows)', () => {
    expect(parseSignal({ verdict: 'inconclusive', evidence: evidence('found') }).success).toBe(
      true
    );
  });

  it('accepts inconclusive with empty evidence', () => {
    expect(parseSignal({ verdict: 'inconclusive', evidence: evidence('empty') }).success).toBe(
      true
    );
  });

  it('rejects inconclusive when evidence is omitted', () => {
    expect(parseSignal({ verdict: 'inconclusive' }).success).toBe(false);
  });

  it('rejects inconclusive when evidence is null', () => {
    expect(parseSignal({ verdict: 'inconclusive', evidence: null }).success).toBe(false);
  });

  it('accepts evidence carrying the executed time_range', () => {
    expect(
      parseSignal({
        verdict: 'confirms',
        evidence: {
          ...evidence('found'),
          time_range: { from: '2026-07-20T07:00:00.000Z', to: '2026-07-20T08:00:00.000Z' },
        },
      }).success
    ).toBe(true);
  });

  it('rejects not_checked with query evidence', () => {
    expect(parseSignal({ verdict: 'not_checked', evidence: evidence('found') }).success).toBe(
      false
    );
  });

  it('accepts not_checked when evidence is omitted', () => {
    expect(parseSignal({ verdict: 'not_checked' }).success).toBe(true);
  });
});

describe('topology classification compatibility', () => {
  it.each([
    {
      type: 'dependency',
      feature_id: 'orders-db',
      source: 'orders-api',
      target: 'postgres',
      stream_name: 'logs.orders',
    },
    {
      type: 'infrastructure',
      feature_id: 'orders-cluster',
      stream_name: 'logs.orders',
    },
    {
      type: 'entity',
      feature_id: 'orders-api',
      name: 'orders-api',
      stream_name: 'logs.orders',
    },
  ])('accepts legacy $type blast-radius rows without subtype', (entry) => {
    expect(blastRadiusEntrySchema.safeParse(entry).success).toBe(true);
  });

  it('accepts legacy causal features without classification', () => {
    expect(
      causalFeatureSchema.safeParse({
        feature_id: 'orders-api',
        name: 'orders-api',
        stream_name: 'logs.orders',
      }).success
    ).toBe(true);
  });
});
