/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SESSION_GAP_MS = 30 * 60 * 1000;

export interface ViewedMarker {
  readonly lastViewedAt: string;
  readonly previousViewedAt: string | null;
}

const isViewedMarker = (value: unknown): value is ViewedMarker =>
  typeof value === 'object' &&
  value !== null &&
  'lastViewedAt' in value &&
  typeof value.lastViewedAt === 'string';

/**
 * A visit within the session gap belongs to the same session, so the comparison point stays.
 * This keeps the delta visible after a page reload.
 */
export const rollViewedMarker = (stored: unknown, now: Date): ViewedMarker => {
  const nowIso = now.toISOString();

  if (!isViewedMarker(stored)) {
    return { lastViewedAt: nowIso, previousViewedAt: null };
  }

  const isSameSession = now.getTime() - new Date(stored.lastViewedAt).getTime() < SESSION_GAP_MS;

  return isSameSession
    ? { lastViewedAt: stored.lastViewedAt, previousViewedAt: stored.previousViewedAt ?? null }
    : { lastViewedAt: nowIso, previousViewedAt: stored.lastViewedAt };
};
