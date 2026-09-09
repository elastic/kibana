/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultTimeBounds, substituteEsqlBindParams } from './esql_bind_params';

describe('getDefaultTimeBounds', () => {
  it('returns ISO bounds relative to the provided now', () => {
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const { tstart, tend } = getDefaultTimeBounds(now);

    expect(tstart).toBe(new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString());
    expect(tend).toBe(new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString());
  });
});

describe('substituteEsqlBindParams', () => {
  it('replaces ?_tstart and ?_tend with quoted ISO timestamps', () => {
    const query =
      'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS c = COUNT(*)';
    const result = substituteEsqlBindParams(query, {
      tstart: '2026-01-01T00:00:00.000Z',
      tend: '2026-01-02T00:00:00.000Z',
    });

    expect(result).toBe(
      'FROM logs | WHERE @timestamp >= "2026-01-01T00:00:00.000Z" AND @timestamp < "2026-01-02T00:00:00.000Z" | STATS c = COUNT(*)'
    );
  });

  it('does not replace longer identifiers that only share a prefix', () => {
    const query = 'FROM logs | WHERE x == ?_tstartfoo AND y == ?_tendbar';
    expect(substituteEsqlBindParams(query, { tstart: 'A', tend: 'B' })).toBe(query);
  });

  it('returns empty or non-string input unchanged', () => {
    expect(substituteEsqlBindParams('')).toBe('');
    expect(substituteEsqlBindParams(undefined as unknown as string)).toBe(undefined);
  });

  it('is idempotent once bind params are already substituted', () => {
    const once = substituteEsqlBindParams(
      'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend',
      { tstart: '2026-01-01T00:00:00.000Z', tend: '2026-01-02T00:00:00.000Z' }
    );
    expect(substituteEsqlBindParams(once)).toBe(once);
  });
});
