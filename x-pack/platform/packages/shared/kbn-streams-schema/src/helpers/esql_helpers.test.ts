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
  extractReferencedColumns,
  extractStatsGroupColumns,
  extractWhereExpression,
  findOverBroadMatchPredicates,
  getStatsQueryHints,
  hasSameEsql,
  hasStatsCommand,
  normalizeEsqlSafe,
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
    const hints = getStatsQueryHints('FROM logs | STATS metric_value = COUNT(*) BY service.name');
    expect(hints).toEqual(
      expect.arrayContaining([expect.stringContaining('no temporal bucketing')])
    );
  });

  it('warns when metric_value column is missing', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, c'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('metric_value')]));
  });

  it('warns about post-STATS WHERE that drops buckets', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute) | WHERE metric_value > 10'
    );
    expect(hints).toEqual(
      expect.arrayContaining([expect.stringContaining('Avoid WHERE after STATS')])
    );
  });

  it('returns no metric-contract hints for well-formed STATS series queries', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value'
    );
    expect(hints).not.toEqual(expect.arrayContaining([expect.stringContaining('metric_value')]));
    expect(hints).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Avoid WHERE after STATS')])
    );
    expect(hints).not.toEqual(expect.arrayContaining([expect.stringContaining('No threshold')]));
  });

  it('warns about disallowed SORT/LIMIT after STATS', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, metric_value | SORT metric_value | LIMIT 100'
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

  it('warns about non-1m bucket intervals', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | KEEP bucket, metric_value'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('1-minute')]));
  });

  it('warns about entity BY dimensions', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS metric_value = COUNT(*) BY service.name, bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, metric_value'
    );
    expect(hints).toEqual(
      expect.arrayContaining([expect.stringContaining('non-temporal GROUP BY')])
    );
  });

  it('notes unfiltered COUNT(*) denominators in rate queries', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value'
    );
    expect(hints).toEqual(expect.arrayContaining([expect.stringContaining('unfiltered COUNT(*)')]));
  });

  it('does not note unfiltered COUNT when denominator uses IS NOT NULL', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value'
    );
    expect(hints).not.toEqual(
      expect.arrayContaining([expect.stringContaining('unfiltered COUNT(*)')])
    );
  });

  it('does not note unfiltered COUNT when denominator uses IN (auth-rate shape)', () => {
    const hints = getStatsQueryHints(
      'FROM logs | STATS failures = COUNT(*) WHERE event.outcome == "failure", attempts = COUNT(*) WHERE event.outcome IN ("success", "failure") BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(attempts > 0, failures * 100.0 / attempts, 0) | KEEP bucket, metric_value'
    );
    expect(hints).not.toEqual(
      expect.arrayContaining([expect.stringContaining('unfiltered COUNT(*)')])
    );
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

describe('normalizeEsqlSafe', () => {
  it('uppercases commands and collapses whitespace', () => {
    expect(normalizeEsqlSafe('from  logs  |  where   x  >  1')).toBe('FROM logs | WHERE x > 1');
  });

  it('sorts commutative AND operands alphabetically', () => {
    expect(normalizeEsqlSafe('FROM logs | WHERE b:"y" AND a:"x"')).toBe(
      normalizeEsqlSafe('FROM logs | WHERE a:"x" AND b:"y"')
    );
  });

  it('sorts commutative OR operands alphabetically', () => {
    expect(normalizeEsqlSafe('FROM logs | WHERE c OR a OR b')).toBe(
      normalizeEsqlSafe('FROM logs | WHERE a OR b OR c')
    );
  });

  it('normalizes nested AND/OR chains', () => {
    const a = 'FROM logs | WHERE (z OR a) AND (y OR b)';
    const b = 'FROM logs | WHERE (b OR y) AND (a OR z)';
    expect(normalizeEsqlSafe(a)).toBe(normalizeEsqlSafe(b));
  });

  it('does not reorder across different operators', () => {
    const q1 = normalizeEsqlSafe('FROM logs | WHERE a AND (b OR c)');
    const q2 = normalizeEsqlSafe('FROM logs | WHERE (b OR c) AND a');
    expect(q1).toBe(q2);

    const q3 = normalizeEsqlSafe('FROM logs | WHERE a OR (b AND c)');
    const q4 = normalizeEsqlSafe('FROM logs | WHERE (b AND c) OR a');
    expect(q3).toBe(q4);
  });

  it('returns deterministic output for garbage input that the parser accepts', () => {
    const a = normalizeEsqlSafe('INVALID   ESQL  {{{');
    const b = normalizeEsqlSafe('INVALID ESQL {{{');
    expect(a).toBe(b);
  });

  it('handles real-world multi-term match queries', () => {
    const a = 'FROM logs | WHERE body.text:"timeout" AND body.text:"connection"';
    const b = 'FROM logs | WHERE body.text:"connection" AND body.text:"timeout"';
    expect(normalizeEsqlSafe(a)).toBe(normalizeEsqlSafe(b));
  });

  it('handles entity-scoped queries with swapped conditions', () => {
    const a =
      'FROM logs | WHERE service.name == "api" AND body.text:"error" AND log.level == "ERROR"';
    const b =
      'FROM logs | WHERE log.level == "ERROR" AND body.text:"error" AND service.name == "api"';
    expect(normalizeEsqlSafe(a)).toBe(normalizeEsqlSafe(b));
  });

  it('preserves all operands in right-nested AND trees', () => {
    const rightNested = normalizeEsqlSafe('FROM logs | WHERE a:"x" AND (b:"y" AND c:"z")');
    const leftAssoc = normalizeEsqlSafe('FROM logs | WHERE a:"x" AND b:"y" AND c:"z"');
    expect(rightNested).toBe(leftAssoc);
    expect(rightNested).toContain('c');
  });

  it('preserves all operands in right-nested OR trees', () => {
    const rightNested = normalizeEsqlSafe('FROM logs | WHERE a OR (b OR c)');
    const leftAssoc = normalizeEsqlSafe('FROM logs | WHERE a OR b OR c');
    expect(rightNested).toBe(leftAssoc);
    expect(rightNested).toContain('c');
  });

  it('handles mixed nesting: AND(AND(a, b), AND(c, d))', () => {
    const mixed = normalizeEsqlSafe('FROM logs | WHERE (a:"w" AND b:"x") AND (c:"y" AND d:"z")');
    const flat = normalizeEsqlSafe('FROM logs | WHERE a:"w" AND b:"x" AND c:"y" AND d:"z"');
    expect(mixed).toBe(flat);
  });

  it('handles STATS queries without altering structure', () => {
    const q =
      'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value';
    const normalized = normalizeEsqlSafe(q);
    expect(normalized).toContain('STATS');
    expect(normalized).toContain('BUCKET');
    expect(normalized).toContain('metric_value');
  });
});

describe('hasSameEsql', () => {
  it('returns true for identical queries', () => {
    expect(hasSameEsql('FROM logs | WHERE x > 1', 'FROM logs | WHERE x > 1')).toBe(true);
  });

  it('returns true for whitespace-different queries', () => {
    expect(hasSameEsql('FROM  logs  |  WHERE  x > 1', 'FROM logs | WHERE x > 1')).toBe(true);
  });

  it('returns true for commutative AND reorderings', () => {
    expect(
      hasSameEsql('FROM logs | WHERE a:"x" AND b:"y"', 'FROM logs | WHERE b:"y" AND a:"x"')
    ).toBe(true);
  });

  it('returns false for semantically different queries', () => {
    expect(hasSameEsql('FROM logs | WHERE a:"x"', 'FROM logs | WHERE b:"y"')).toBe(false);
  });

  it('returns false when one has additional conditions', () => {
    expect(hasSameEsql('FROM logs | WHERE a:"x"', 'FROM logs | WHERE a:"x" AND b:"y"')).toBe(false);
  });

  it('treats garbage inputs that the parser accepts consistently', () => {
    expect(hasSameEsql('BAD  QUERY  {{{', 'BAD QUERY {{{')).toBe(true);
  });

  it('distinguishes valid but different queries', () => {
    expect(hasSameEsql('FROM logs | WHERE a > 1', 'FROM logs | WHERE b > 2')).toBe(false);
  });
});

describe('findOverBroadMatchPredicates', () => {
  it('flags a multi-word `:` value', () => {
    expect(findOverBroadMatchPredicates('FROM logs | WHERE message : "request failed"')).toEqual([
      { field: 'message', value: 'request failed', operator: ':' },
    ]);
  });

  it('flags a multi-word MATCH value with no options', () => {
    expect(
      findOverBroadMatchPredicates('FROM logs | WHERE MATCH(message, "request failed")')
    ).toEqual([{ field: 'message', value: 'request failed', operator: 'MATCH' }]);
  });

  it('does not flag a single-word `:` value', () => {
    expect(
      findOverBroadMatchPredicates('FROM logs | WHERE error.type : "OutOfMemoryError"')
    ).toEqual([]);
  });

  it('does not flag MATCH_PHRASE', () => {
    expect(
      findOverBroadMatchPredicates('FROM logs | WHERE MATCH_PHRASE(message, "request failed")')
    ).toEqual([]);
  });

  it('does not flag MATCH with an explicit AND operator', () => {
    expect(
      findOverBroadMatchPredicates(
        'FROM logs | WHERE MATCH(message, "request failed", {"operator": "AND"})'
      )
    ).toEqual([]);
  });

  it('returns an empty array for an unparseable query', () => {
    expect(findOverBroadMatchPredicates('THIS IS NOT ESQL {{{')).toEqual([]);
  });
});

describe('extractReferencedColumns', () => {
  it('collects field references across clauses, including a field under a cast', () => {
    const columns = extractReferencedColumns(
      'FROM logs | WHERE svc::keyword == "x" AND msg == "y"'
    );
    expect(new Set(columns)).toEqual(new Set(['svc', 'msg']));
  });

  it('returns an empty array for an unparseable query', () => {
    expect(extractReferencedColumns('THIS IS NOT ESQL {{{')).toEqual([]);
  });
});
