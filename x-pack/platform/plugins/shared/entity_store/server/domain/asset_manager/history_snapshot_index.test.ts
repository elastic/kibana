/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseHistorySnapshotIndexDate } from './history_snapshot_index';

describe('parseHistorySnapshotIndexDate', () => {
  it('returns the UTC calendar date and ignores the hour', () => {
    expect(parseHistorySnapshotIndexDate('.entities.v2.history.default.2026-08-15-00')).toBe(
      '2026-08-15'
    );
    expect(parseHistorySnapshotIndexDate('.entities.v2.history.default.2026-08-15-23')).toBe(
      '2026-08-15'
    );
  });

  it('parses legacy Security-scoped history index names', () => {
    expect(
      parseHistorySnapshotIndexDate('.entities.v2.history.security_default.2026-01-02-14')
    ).toBe('2026-01-02');
  });

  it('returns undefined for names without a date-hour suffix', () => {
    expect(parseHistorySnapshotIndexDate('.entities.v2.history.default')).toBeUndefined();
    expect(parseHistorySnapshotIndexDate('.entities.v2.latest.default-00001')).toBeUndefined();
  });

  it('returns undefined for impossible calendar dates', () => {
    expect(
      parseHistorySnapshotIndexDate('.entities.v2.history.default.2026-02-30-00')
    ).toBeUndefined();
  });
});
