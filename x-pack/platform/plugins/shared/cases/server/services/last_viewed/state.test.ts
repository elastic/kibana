/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_LAST_VIEWED_ENTRIES } from '../../../common/constants';
import type { LastViewedEntry } from './state';
import { ENTRY_TTL_MS, getSeenAt, recordView, SESSION_GAP_MS, WRITE_THROTTLE_MS } from './state';

const now = new Date('2026-11-20T10:00:00.000Z');
const msAgo = (ms: number) => new Date(now.getTime() - ms).toISOString();
const key = 'cases:case-1';

const view = (entries: LastViewedEntry[], overrides: { markSeen?: boolean; at?: Date } = {}) =>
  recordView({ entries, key, now: overrides.at ?? now, markSeen: overrides.markSeen ?? false });

describe('recordView', () => {
  it('writes a first-visit entry without a window start', () => {
    const { entries, changed } = view([]);

    expect(changed).toBe(true);
    expect(entries).toEqual([{ key, viewedAt: now.toISOString(), seenAt: null }]);
  });

  it('starts a new session after the session gap and uses the last visit as window start', () => {
    const previousVisit = msAgo(SESSION_GAP_MS + 1);

    const { entries } = view([{ key, viewedAt: previousVisit, seenAt: null }]);

    expect(entries).toEqual([{ key, viewedAt: now.toISOString(), seenAt: previousVisit }]);
  });

  it('keeps the window start for a visit inside the session gap', () => {
    const seenAt = msAgo(5 * SESSION_GAP_MS);
    const viewedAt = msAgo(WRITE_THROTTLE_MS + 1);

    const { entries } = view([{ key, viewedAt, seenAt }]);

    expect(entries).toEqual([{ key, viewedAt: now.toISOString(), seenAt }]);
  });

  it('does not write for a repeat visit inside the throttle window', () => {
    const existing = [{ key, viewedAt: msAgo(1000), seenAt: msAgo(SESSION_GAP_MS) }];

    expect(view(existing)).toEqual({ entries: existing, changed: false });
  });

  it('moves the window start to now when the user marks the case as seen', () => {
    const { entries } = view([{ key, viewedAt: msAgo(1000), seenAt: msAgo(SESSION_GAP_MS) }], {
      markSeen: true,
    });

    expect(entries).toEqual([{ key, viewedAt: now.toISOString(), seenAt: now.toISOString() }]);
  });

  it('drops entries older than the time to live', () => {
    const stale = { key: 'cases:old', viewedAt: msAgo(ENTRY_TTL_MS + 1), seenAt: null };

    const { entries } = view([stale]);

    expect(entries.map((entry) => entry.key)).toEqual([key]);
  });

  it('keeps only the most recent entries', () => {
    const existing = Array.from({ length: MAX_LAST_VIEWED_ENTRIES }, (_, index) => ({
      key: `cases:${index}`,
      viewedAt: msAgo((index + 1) * 1000),
      seenAt: null,
    }));

    const { entries } = view(existing);

    expect(entries).toHaveLength(MAX_LAST_VIEWED_ENTRIES);
    expect(entries[0].key).toBe(key);
    expect(entries.map((entry) => entry.key)).not.toContain(`cases:${MAX_LAST_VIEWED_ENTRIES - 1}`);
  });
});

describe('getSeenAt', () => {
  it('returns null when the case has no entry', () => {
    expect(getSeenAt([], key)).toBeNull();
  });

  it('returns the window start of the entry', () => {
    expect(getSeenAt([{ key, viewedAt: msAgo(1), seenAt: msAgo(100) }], key)).toBe(msAgo(100));
  });
});
