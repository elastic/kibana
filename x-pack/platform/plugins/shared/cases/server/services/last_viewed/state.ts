/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_LAST_VIEWED_ENTRIES } from '../../../common/constants';

export interface LastViewedEntry {
  readonly key: string;
  /** Last time the user opened the entity. */
  readonly viewedAt: string;
  /** Start of the "what is new" window. Null on the first visit. */
  readonly seenAt: string | null;
}

export const SESSION_GAP_MS = 30 * 60 * 1000;
export const WRITE_THROTTLE_MS = 2 * 60 * 1000;
export const ENTRY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface RecordViewParams {
  readonly entries: readonly LastViewedEntry[];
  readonly key: string;
  readonly now: Date;
  readonly markSeen: boolean;
}

interface RecordViewResult {
  readonly entries: readonly LastViewedEntry[];
  readonly changed: boolean;
}

export const getSeenAt = (entries: readonly LastViewedEntry[], key: string): string | null =>
  entries.find((entry) => entry.key === key)?.seenAt ?? null;

const nextEntry = (
  existing: LastViewedEntry | undefined,
  key: string,
  now: Date,
  markSeen: boolean
): LastViewedEntry | undefined => {
  const nowIso = now.toISOString();

  if (markSeen) {
    return { key, viewedAt: nowIso, seenAt: nowIso };
  }

  if (existing == null) {
    return { key, viewedAt: nowIso, seenAt: null };
  }

  const elapsed = now.getTime() - new Date(existing.viewedAt).getTime();

  if (elapsed < WRITE_THROTTLE_MS) {
    return undefined;
  }

  // A visit after the session gap starts a new session: the last visit becomes the window start.
  return elapsed >= SESSION_GAP_MS
    ? { key, viewedAt: nowIso, seenAt: existing.viewedAt }
    : { ...existing, viewedAt: nowIso };
};

const prune = (entries: readonly LastViewedEntry[], now: Date): LastViewedEntry[] =>
  entries
    .filter((entry) => now.getTime() - new Date(entry.viewedAt).getTime() < ENTRY_TTL_MS)
    .toSorted((a, b) => b.viewedAt.localeCompare(a.viewedAt))
    .slice(0, MAX_LAST_VIEWED_ENTRIES);

export const recordView = ({ entries, key, now, markSeen }: RecordViewParams): RecordViewResult => {
  const existing = entries.find((entry) => entry.key === key);
  const next = nextEntry(existing, key, now, markSeen);

  if (next == null) {
    return { entries, changed: false };
  }

  const others = entries.filter((entry) => entry.key !== key);
  return { entries: prune([next, ...others], now), changed: true };
};
