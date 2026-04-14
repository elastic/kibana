/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveQueryType,
  ensureMetadata,
  extractBucketColumnName,
  extractBucketIntervalMs,
  extractStatsGroupColumns,
  extractWhereExpression,
  getStatsQueryHints,
  hasStatsCommand,
} from './esql_helpers';

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
    expect(extractStatsGroupColumns(query)).toEqual(['http.response.status_code', 'service.name']);
  });

  it('returns sorted column names', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY zone, app, bucket = BUCKET(@timestamp, 5m)';
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

  it('extracts bucket interval from non-@timestamp fields', () => {
    const query = 'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(event.created, 5 minutes)';
    expect(extractBucketIntervalMs(query)).toBe(300_000);
  });
});

describe('hasStatsCommand', () => {
  it('returns true for STATS queries', () => {
    expect(hasStatsCommand('FROM logs | STATS c = COUNT(*) BY service.name')).toBe(true);
  });

  it('returns false for match queries', () => {
    expect(hasStatsCommand('FROM logs | WHERE x > 1')).toBe(false);
  });

  it('returns false on parse failure', () => {
    expect(hasStatsCommand('NOT VALID {{{')).toBe(false);
  });
});

describe('deriveQueryType', () => {
  it('returns stats for STATS queries', () => {
    expect(deriveQueryType('FROM logs | STATS c = COUNT(*) BY service.name')).toBe('stats');
  });

  it('returns match for queries without STATS', () => {
    expect(deriveQueryType('FROM logs | WHERE log.level == "ERROR"')).toBe('match');
  });

  it('returns match for unparseable queries', () => {
    expect(deriveQueryType('INVALID QUERY {{{')).toBe('match');
  });
});

describe('getStatsQueryHints', () => {
  it('warns about missing temporal bucketing', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS c = COUNT(*) BY service.name | WHERE c > 10'
    );
    expect(hints).toEqual(
      expect.arrayContaining([expect.stringContaining('no temporal bucketing')])
    );
  });

  it('warns about missing threshold filter after STATS', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 5m)'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('No threshold filter')]));
  });

  it('returns no hints for well-formed STATS queries', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 5m) | WHERE c > 10'
    );
    expect(hints).toEqual([]);
  });

  it('warns about disallowed commands in STATS queries', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 5m) | WHERE c > 10 | SORT c | LIMIT 100'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('SORT, LIMIT')]));
  });

  it('warns about EVAL in non-STATS queries', () => {
    const hints = getStatsQueryHints('FROM logs | EVAL x = 1');
    expect(hints).toEqual(
      expect.arrayContaining([expect.stringContaining('EVAL is supported only')])
    );
  });

  it('returns empty array on parse failure', () => {
    expect(getStatsQueryHints('INVALID {{{')).toEqual([]);
  });

  it('warns about missing sample-size floor for rate queries', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) BY bucket = BUCKET(@timestamp, 5m) | EVAL error_rate = errors * 100.0 / total | WHERE error_rate != 0'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('sample-size floor')]));
  });

  it('does not warn about sample-size floor when total > N guard is present', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) BY bucket = BUCKET(@timestamp, 5m) | EVAL error_rate = errors * 100.0 / total | WHERE total > 20 AND error_rate > 5'
    );
    expect(hints).not.toEqual(
      expect.arrayContaining([expect.stringContaining('sample-size floor')])
    );
  });

  it('notes missing IS NOT NULL on unfiltered total denominator', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) BY bucket = BUCKET(@timestamp, 5m) | EVAL error_rate = errors * 100.0 / total | WHERE total > 20 AND error_rate > 5'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('IS NOT NULL')]));
  });

  it('does not note IS NOT NULL when denominator already filters', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 5m) | EVAL error_rate = errors * 100.0 / total | WHERE total > 20 AND error_rate > 5'
    );
    expect(hints).not.toEqual(expect.arrayContaining([expect.stringContaining('IS NOT NULL')]));
  });
});

describe('extractBucketColumnName', () => {
  it('extracts aliased bucket column name', () => {
    expect(
      extractBucketColumnName(
        'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes)'
      )
    ).toBe('bucket');
  });

  it('extracts custom alias names', () => {
    expect(
      extractBucketColumnName('FROM logs | STATS c = COUNT(*) BY ts = BUCKET(@timestamp, 1h)')
    ).toBe('ts');
  });

  it('handles TBUCKET syntax', () => {
    expect(
      extractBucketColumnName(
        'FROM logs | STATS c = COUNT(*) BY time_bucket = TBUCKET(@timestamp, 10m)'
      )
    ).toBe('time_bucket');
  });

  it('returns null for STATS without BUCKET', () => {
    expect(extractBucketColumnName('FROM logs | STATS c = COUNT(*) BY service.name')).toBeNull();
  });

  it('returns null for match queries', () => {
    expect(extractBucketColumnName('FROM logs | WHERE x > 1')).toBeNull();
  });

  it('returns null on parse failure', () => {
    expect(extractBucketColumnName('INVALID {{{')).toBeNull();
  });
});
