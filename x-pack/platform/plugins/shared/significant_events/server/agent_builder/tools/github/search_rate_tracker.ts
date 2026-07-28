/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type GithubSearchPhase = 'service-discovery' | 'logging-sites' | 'unknown';
export type GithubSearchStatus = 'success' | 'rate_limited' | 'error';

export interface GithubSearchCodeRecord {
  timestamp: string;
  toolCallId: string;
  phase: GithubSearchPhase;
  repository?: string;
  serviceName?: string;
  query: string;
  status: GithubSearchStatus;
  durationMs: number;
}

export interface GithubSearchRateReport {
  total: number;
  byPhase: Record<GithubSearchPhase, number>;
  byService: Record<string, number>;
  averagePerMinute: number;
  maxRollingSixtySeconds: number;
  maxWindowStartedAt?: string;
  windowsOverLimit: number;
  rateLimited: number;
  failed: number;
  duplicateQueries: number;
  firstRequestAt?: string;
  lastRequestAt?: string;
  records: GithubSearchCodeRecord[];
}

const MAX_RECORDS = 10_000;
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

// POC-only process-local measurement. Records are isolated by space, but a
// complete report requires a single Kibana instance for the duration of a run.
const recordsBySpace = new Map<string, GithubSearchCodeRecord[]>();

export const recordGithubSearchCodeCall = (
  spaceId: string,
  record: GithubSearchCodeRecord
): void => {
  const records = recordsBySpace.get(spaceId) ?? [];
  records.push(record);
  if (records.length > MAX_RECORDS) {
    records.splice(0, records.length - MAX_RECORDS);
  }
  recordsBySpace.set(spaceId, records);
};

export const resetGithubSearchRateReport = (spaceId: string): void => {
  recordsBySpace.delete(spaceId);
};

export const getGithubSearchRateReport = (spaceId: string): GithubSearchRateReport => {
  const ordered = [...(recordsBySpace.get(spaceId) ?? [])].sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)
  );
  const byPhase: Record<GithubSearchPhase, number> = {
    'service-discovery': 0,
    'logging-sites': 0,
    unknown: 0,
  };
  const byService: Record<string, number> = {};
  const queryCounts = new Map<string, number>();

  for (const record of ordered) {
    byPhase[record.phase] += 1;
    if (record.serviceName) {
      byService[record.serviceName] = (byService[record.serviceName] ?? 0) + 1;
    }
    const queryKey = `${record.repository ?? ''}:${record.query}`;
    queryCounts.set(queryKey, (queryCounts.get(queryKey) ?? 0) + 1);
  }

  let maxRollingSixtySeconds = 0;
  let maxWindowStartedAt: string | undefined;
  let windowsOverLimit = 0;
  let start = 0;
  for (let end = 0; end < ordered.length; end += 1) {
    const endTime = Date.parse(ordered[end].timestamp);
    while (start <= end && endTime - Date.parse(ordered[start].timestamp) >= WINDOW_MS) {
      start += 1;
    }
    const count = end - start + 1;
    if (count > maxRollingSixtySeconds) {
      maxRollingSixtySeconds = count;
      maxWindowStartedAt = ordered[start]?.timestamp;
    }
    if (count > RATE_LIMIT) {
      windowsOverLimit += 1;
    }
  }

  const firstTime = ordered[0] ? Date.parse(ordered[0].timestamp) : undefined;
  const lastTime = ordered.at(-1) ? Date.parse(ordered.at(-1)!.timestamp) : undefined;
  const durationMinutes =
    firstTime !== undefined && lastTime !== undefined
      ? Math.max((lastTime - firstTime) / WINDOW_MS, 1 / 60)
      : 0;

  return {
    total: ordered.length,
    byPhase,
    byService,
    // A single observation has no meaningful elapsed rate; total remains the
    // authoritative count until at least two timestamps define a duration.
    averagePerMinute:
      ordered.length > 1 && durationMinutes > 0 ? ordered.length / durationMinutes : 0,
    maxRollingSixtySeconds,
    maxWindowStartedAt,
    windowsOverLimit,
    rateLimited: ordered.filter(({ status }) => status === 'rate_limited').length,
    failed: ordered.filter(({ status }) => status === 'error').length,
    duplicateQueries: [...queryCounts.values()].reduce(
      (duplicates, count) => duplicates + Math.max(0, count - 1),
      0
    ),
    firstRequestAt: ordered[0]?.timestamp,
    lastRequestAt: ordered.at(-1)?.timestamp,
    records: ordered,
  };
};
