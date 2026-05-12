/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STORAGE_KEY = 'xpack.queryActivity.stopRequestedTasks';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

type StopRequestedMap = Record<string, number>;

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function parseMap(raw: string | null): StopRequestedMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as StopRequestedMap;
  } catch {
    return {};
  }
}

function readMap(storage: Storage): StopRequestedMap {
  return parseMap(storage.getItem(STORAGE_KEY));
}

function writeMap(storage: Storage, map: StopRequestedMap): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota / disabled storage errors
  }
}

function isExpired(now: number, timestamp: number, ttlMs: number): boolean {
  return now - timestamp > ttlMs;
}

export function markStopRequestedTask(taskId: string, now: number = Date.now()): void {
  const storage = getStorage();
  if (!storage) return;

  const map = readMap(storage);
  map[taskId] = now;
  writeMap(storage, map);
}

export function getStopRequestedTaskIds(options?: {
  now?: number;
  ttlMs?: number;
  validTaskIds?: ReadonlySet<string>;
}): Set<string> {
  const storage = getStorage();
  if (!storage) return new Set();

  const now = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const validTaskIds = options?.validTaskIds;

  const map = readMap(storage);
  const ids = new Set<string>();

  for (const [taskId, ts] of Object.entries(map)) {
    if (typeof ts !== 'number') continue;
    if (isExpired(now, ts, ttlMs)) continue;
    if (validTaskIds && !validTaskIds.has(taskId)) continue;
    ids.add(taskId);
  }

  return ids;
}

export function pruneStopRequestedTasks(options?: {
  now?: number;
  ttlMs?: number;
  validTaskIds?: ReadonlySet<string>;
}): void {
  const storage = getStorage();
  if (!storage) return;

  const now = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const validTaskIds = options?.validTaskIds;

  const map = readMap(storage);
  let didChange = false;

  for (const [taskId, ts] of Object.entries(map)) {
    if (typeof ts !== 'number') {
      delete map[taskId];
      didChange = true;
      continue;
    }
    if (isExpired(now, ts, ttlMs)) {
      delete map[taskId];
      didChange = true;
      continue;
    }
    if (validTaskIds && !validTaskIds.has(taskId)) {
      delete map[taskId];
      didChange = true;
    }
  }

  if (didChange) {
    writeMap(storage, map);
  }
}
