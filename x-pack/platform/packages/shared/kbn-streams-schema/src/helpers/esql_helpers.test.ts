/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureMetadata, extractBucketIntervalMs, extractStatsGroupColumns, extractWhereExpression } from './esql_helpers';

describe('extractWhereExpression', () => {
  it('returns the WHERE expression when present', () => {
    const expr = extractWhereExpression('FROM logs* | WHERE message == "error"');
    expect(expr).toBeDefined();
  });

  it('returns undefined when there is no WHERE clause', () => {
    expect(extractWhereExpression('FROM logs*')).toBeUndefined();
  });
});

describe('ensureMetadata', () => {
  it('adds METADATA _id, _source when missing', () => {
    const result = ensureMetadata('FROM logs* | WHERE x > 1');
    expect(result).toBe('FROM logs* METADATA _id, _source | WHERE x > 1');
  });

  it('does not duplicate METADATA when already present', () => {
    const query = 'FROM logs* METADATA _id, _source | WHERE x > 1';
    expect(ensureMetadata(query)).toBe(query);
  });

  it('handles queries without a WHERE clause', () => {
    const result = ensureMetadata('FROM logs*');
    expect(result).toBe('FROM logs* METADATA _id, _source');
  });

  it('handles multi-index FROM clauses', () => {
    const result = ensureMetadata('FROM logs.child,logs.child.* | WHERE status == "ok"');
    expect(result).toContain('METADATA _id, _source');
    expect(result).toContain('logs.child');
    expect(result).toContain('logs.child.*');
    expect(result).toContain('WHERE status == "ok"');
  });

  it('preserves KQL function calls in the WHERE clause', () => {
    const result = ensureMetadata(
      'FROM logs.child,logs.child.* | WHERE KQL("message: \\"error\\"")'
    );
    expect(result).toContain('METADATA _id, _source');
    expect(result).toContain('KQL("message: \\"error\\""');
  });

  it('returns the original string if there is no FROM command', () => {
    expect(ensureMetadata('SHOW INFO')).toBe('SHOW INFO');
  });
});

describe('extractStatsGroupColumns', () => {
  it('extracts aliased and plain group-by columns', () => {
    const query =
      'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes), service.name';
    expect(extractStatsGroupColumns(query)).toEqual(['bucket', 'service.name']);
  });

  it('extracts numeric group-by columns from BY clause', () => {
    const query =
      'FROM logs | STATS error_count = COUNT(*) BY http.response.status_code, service.name | WHERE error_count > 10';
    expect(extractStatsGroupColumns(query)).toEqual([
      'http.response.status_code',
      'service.name',
    ]);
  });

  it('returns sorted column names', () => {
    const query =
      'FROM logs | STATS c = COUNT(*) BY zone, app, bucket = BUCKET(@timestamp, 5m)';
    expect(extractStatsGroupColumns(query)).toEqual(['app', 'bucket', 'zone']);
  });

  it('returns empty array for match queries', () => {
    expect(extractStatsGroupColumns('FROM logs | WHERE x > 1')).toEqual([]);
  });

  it('returns empty array for STATS without BY clause', () => {
    expect(extractStatsGroupColumns('FROM logs | STATS total = COUNT(*)')).toEqual([]);
  });

  it('returns empty array on parse failure', () => {
    expect(extractStatsGroupColumns('NOT VALID ESQL {{{')).toEqual([]);
  });
});

describe('extractBucketIntervalMs', () => {
  it('extracts 5 minutes bucket interval', () => {
    const query =
      'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | WHERE errors > 10';
    expect(extractBucketIntervalMs(query)).toBe(300_000);
  });

  it('extracts compact time unit (5m)', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 5m)';
    expect(extractBucketIntervalMs(query)).toBe(300_000);
  });

  it('extracts 1 hour bucket interval', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 1 hour)';
    expect(extractBucketIntervalMs(query)).toBe(3_600_000);
  });

  it('extracts 30 seconds bucket interval', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 30 seconds)';
    expect(extractBucketIntervalMs(query)).toBe(30_000);
  });

  it('extracts 1 day bucket interval', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 1d)';
    expect(extractBucketIntervalMs(query)).toBe(86_400_000);
  });

  it('handles case-insensitive BUCKET/bucket', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = bucket(@timestamp, 10 minutes)';
    expect(extractBucketIntervalMs(query)).toBe(600_000);
  });

  it('handles TBUCKET syntax', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = TBUCKET(@timestamp, 5 minutes)';
    expect(extractBucketIntervalMs(query)).toBe(300_000);
  });

  it('returns null for non-bucketed STATS queries', () => {
    const query = 'FROM logs | STATS errors = COUNT(*) BY service.name | WHERE errors > 10';
    expect(extractBucketIntervalMs(query)).toBeNull();
  });

  it('returns null for match queries', () => {
    const query = 'FROM logs METADATA _id, _source | WHERE log.level == "ERROR"';
    expect(extractBucketIntervalMs(query)).toBeNull();
  });

  it('returns null when bucket is not on @timestamp', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(event.created, 5 minutes)';
    expect(extractBucketIntervalMs(query)).toBeNull();
  });
});
