/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STATS_COLUMN, UNIT_HEARTBEAT_DOWN_THRESHOLD_MS } from '../constants';
import { mapUnitLivenessRows, NO_UNIT_LIVENESS } from './map_unit_liveness';

const now = new Date('2026-11-25T12:00:00.000Z');

/** The row of the heartbeat query for a heartbeat this long before now. */
const rowAgo = (ms: number) => [
  { [STATS_COLUMN.lastSeen]: new Date(now.getTime() - ms).toISOString() },
];

describe('mapUnitLivenessRows', () => {
  it('is no heartbeat when the query returned no row', () => {
    expect(mapUnitLivenessRows({ rows: [], now })).toEqual(NO_UNIT_LIVENESS);
  });

  it('is no heartbeat when the row has no last seen, as with no match in the lookback', () => {
    expect(mapUnitLivenessRows({ rows: [{ [STATS_COLUMN.lastSeen]: null }], now })).toEqual({
      state: 'no_heartbeat',
      last_seen: null,
    });
  });

  it('is up, with the time it was last seen, for a recent heartbeat', () => {
    const rows = rowAgo(30_000);

    expect(mapUnitLivenessRows({ rows, now })).toEqual({
      state: 'up',
      last_seen: rows[0][STATS_COLUMN.lastSeen],
    });
  });

  it('is up at exactly the down threshold, and down just past it', () => {
    expect(mapUnitLivenessRows({ rows: rowAgo(UNIT_HEARTBEAT_DOWN_THRESHOLD_MS), now }).state).toBe(
      'up'
    );
    expect(
      mapUnitLivenessRows({ rows: rowAgo(UNIT_HEARTBEAT_DOWN_THRESHOLD_MS + 1), now }).state
    ).toBe('down');
  });

  it('is down, with the time it was last seen, for an old heartbeat', () => {
    const rows = rowAgo(UNIT_HEARTBEAT_DOWN_THRESHOLD_MS * 10);

    expect(mapUnitLivenessRows({ rows, now })).toEqual({
      state: 'down',
      last_seen: rows[0][STATS_COLUMN.lastSeen],
    });
  });
});
