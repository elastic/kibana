/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

// Remote-cluster topology changes rarely, so the probe result is cached
// process-wide for this TTL to avoid a `cluster.remoteInfo` round-trip on every
// search. The trade-off: a newly connected/disconnected remote can take up to
// this long to be reflected in CCS index targeting. Use `resetCcsCache` in
// tests (or when topology is known to have changed) to clear it.
const CCS_CACHE_TTL_MS = 60 * 1000;

interface CcsCache {
  value: boolean;
  timestamp: number;
}

let ccsCache: CcsCache | null = null;

export const resetCcsCache = (): void => {
  ccsCache = null;
};

export const hasConnectedRemoteClusters = async (
  esClient: ElasticsearchClient
): Promise<boolean> => {
  const now = Date.now();

  if (ccsCache !== null && now - ccsCache.timestamp < CCS_CACHE_TTL_MS) {
    return ccsCache.value;
  }

  try {
    const response = await esClient.cluster.remoteInfo();
    const connected = Object.values(response).some((r) => r.connected);

    ccsCache = { value: connected, timestamp: now };

    return connected;
  } catch {
    ccsCache = { value: false, timestamp: now };

    return false;
  }
};

export const prefixIndexPatternsWithCcs = (
  indexPattern: string | string[],
  ccsEnabled: boolean
): string[] => {
  const patterns = Array.isArray(indexPattern) ? indexPattern : [indexPattern];

  if (!ccsEnabled) {
    return patterns;
  }

  const ccsPatterns = patterns.map((p) => `*:${p}`);

  return [...patterns, ...ccsPatterns];
};
