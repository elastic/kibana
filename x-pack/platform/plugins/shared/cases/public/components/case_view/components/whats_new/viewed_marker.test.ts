/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rollViewedMarker, SESSION_GAP_MS } from './viewed_marker';

const now = new Date('2026-11-20T10:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

describe('rollViewedMarker', () => {
  it('starts a marker without a comparison point on a first visit', () => {
    expect(rollViewedMarker(undefined, now)).toEqual({
      lastViewedAt: now.toISOString(),
      previousViewedAt: null,
    });
  });

  it('ignores stored values with the wrong shape', () => {
    expect(rollViewedMarker({ lastViewedAt: 5 }, now).previousViewedAt).toBeNull();
  });

  it('moves the last visit to the comparison point after the session gap', () => {
    const stored = { lastViewedAt: minutesAgo(SESSION_GAP_MS / 60000 + 1), previousViewedAt: null };

    expect(rollViewedMarker(stored, now)).toEqual({
      lastViewedAt: now.toISOString(),
      previousViewedAt: stored.lastViewedAt,
    });
  });

  it('keeps the comparison point for a visit inside the session gap', () => {
    const stored = { lastViewedAt: minutesAgo(5), previousViewedAt: minutesAgo(4000) };

    expect(rollViewedMarker(stored, now)).toEqual(stored);
  });
});
