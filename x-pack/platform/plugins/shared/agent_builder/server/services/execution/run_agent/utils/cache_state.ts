/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteCacheControl } from '@kbn/inference-common';
import { CACHE_FRESHNESS_FALLBACK_SECONDS } from '../constants';

export type CacheState = 'hot' | 'cold';

/** `'5m'` → 300, `'1h'` → 3600. We choose the TTL we ask the provider for, so no provider lookup. */
export const parseCacheControlTtl = (
  cacheControl?: ChatCompleteCacheControl
): number | undefined => {
  const ttl = cacheControl?.ttl;
  if (!ttl) return undefined;
  const match = /^(\d+)([mh])$/.exec(ttl);
  if (!match) return undefined;
  return parseInt(match[1], 10) * (match[2] === 'h' ? 3600 : 60);
};

export const computeCacheState = ({
  lastTerminatedAt,
  lastConnectorId,
  connectorId,
  cacheControl,
  now = Date.now(),
}: {
  lastTerminatedAt?: string;
  lastConnectorId?: string;
  connectorId: string;
  cacheControl?: ChatCompleteCacheControl;
  now?: number;
}): CacheState => {
  if (!lastTerminatedAt || lastConnectorId !== connectorId) return 'cold';
  const ttl = parseCacheControlTtl(cacheControl) ?? CACHE_FRESHNESS_FALLBACK_SECONDS;
  return (now - Date.parse(lastTerminatedAt)) / 1000 > ttl ? 'cold' : 'hot';
};
