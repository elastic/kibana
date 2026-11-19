/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCountQuery } from './build_count_query';

describe('buildCountQuery', () => {
  it('counts a single index', () => {
    expect(buildCountQuery({ index: 'logs-*' })).toBe('FROM logs-* | STATS total = COUNT(*)');
  });

  it('counts multiple indices', () => {
    expect(buildCountQuery({ index: ['logs-a', 'logs-b'] })).toBe(
      'FROM logs-a, logs-b | STATS total = COUNT(*)'
    );
  });

  it('applies a KQL filter via WHERE KQL(...)', () => {
    expect(buildCountQuery({ index: 'logs-*', kql: 'service.name : "foo"' })).toBe(
      'FROM logs-* | WHERE KQL("service.name : \\"foo\\"") | STATS total = COUNT(*)'
    );
  });

  it('applies the time range as an inline WHERE', () => {
    expect(buildCountQuery({ index: 'logs-*', start: 100, end: 200 })).toBe(
      'FROM logs-* | WHERE @timestamp >= "1970-01-01T00:00:00.100Z" AND @timestamp <= "1970-01-01T00:00:00.200Z" | STATS total = COUNT(*)'
    );
  });
});
