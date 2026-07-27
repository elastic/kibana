/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A tail cursor is exactly the `sort` values of the last consumed document:
 * `[@timestamp epoch millis, event.id]`. It is plain data, so it can live in
 * memory (ephemeral) or be persisted in Task Manager state (durable), and
 * resumed at any time. It is used as an exclusive `search_after`, so the next
 * read resumes at the event *after* the cursor (no re-delivery).
 */
export type Cursor = [number, string];

/** Serializable form of a cursor for Task Manager state. */
export interface StoredCursor {
  ts: number;
  id: string;
}

/**
 * Cursor positioned at "now": `search_after` of `[now, '']` returns only
 * documents indexed at or after now (an empty-string id sorts before any real
 * UUIDv7). This is the ephemeral default (at-most-once, start fresh on boot).
 */
export const cursorFromNow = (): Cursor => [Date.now(), ''];

export const toStored = (cursor: Cursor | null): StoredCursor | null =>
  cursor ? { ts: cursor[0], id: cursor[1] } : null;

export const fromStored = (stored: StoredCursor | null | undefined): Cursor | null =>
  stored ? [stored.ts, stored.id] : null;

/** Build the cursor for an event from its delivered fields. */
export const cursorFromEvent = (timestamp: string, id: string): Cursor => [
  Date.parse(timestamp),
  id,
];
