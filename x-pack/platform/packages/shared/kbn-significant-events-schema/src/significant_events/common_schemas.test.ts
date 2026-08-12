/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { signalEvidenceSchema } from './common_schemas';

const ABSOLUTE_QUERY =
  'FROM logs.* | WHERE @timestamp >= "2026-06-11T15:03:00Z" AND @timestamp <= "2026-06-11T15:10:00.000Z" | WHERE body.text : "ECONNREFUSED"';

describe('signalEvidenceSchema', () => {
  const baseEvidence = {
    esql_query: ABSOLUTE_QUERY,
    result: 'found' as const,
  };

  it('accepts a valid evidence object', () => {
    expect(signalEvidenceSchema.safeParse(baseEvidence).success).toBe(true);
  });

  it('rejects a query that contains the grounding projection tail (| KEEP @timestamp)', () => {
    expect(
      signalEvidenceSchema.safeParse({
        ...baseEvidence,
        esql_query:
          'FROM logs.* | WHERE @timestamp >= "2026-06-11T15:03:00Z" AND @timestamp <= "2026-06-11T15:10:00.000Z" | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
      }).success
    ).toBe(false);
  });

  it('rejects a query that contains NOW() — the upper bound must be absolute', () => {
    expect(
      signalEvidenceSchema.safeParse({
        ...baseEvidence,
        esql_query:
          'FROM logs.* | WHERE @timestamp >= "2026-06-11T15:03:00Z" AND @timestamp <= NOW() | WHERE body.text : "ECONNREFUSED"',
      }).success
    ).toBe(false);
  });

  it('accepts aggregation queries that contain | SORT or | LIMIT but not | KEEP @timestamp', () => {
    expect(
      signalEvidenceSchema.safeParse({
        ...baseEvidence,
        esql_query:
          'FROM logs.* | WHERE @timestamp >= "2026-06-11T15:03:00Z" AND @timestamp <= "2026-06-11T15:10:00.000Z" | STATS count = COUNT(*) BY service.name | SORT count DESC | LIMIT 10',
      }).success
    ).toBe(true);
  });

  it('accepts all result enum values', () => {
    for (const result of ['found', 'empty', 'error'] as const) {
      expect(signalEvidenceSchema.safeParse({ ...baseEvidence, result }).success).toBe(true);
    }
  });

  it('rejects an unknown result value', () => {
    expect(signalEvidenceSchema.safeParse({ ...baseEvidence, result: 'unknown' }).success).toBe(
      false
    );
  });
});
