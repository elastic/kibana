/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchRequestItem, MsearchResponseItem } from '@elastic/elasticsearch/lib/api/types';

/**
 * One `msearch` entry that reads nothing but tells us whether the caller may read `target`. Sent as
 * the caller, so Elasticsearch index privileges decide the outcome. Strict index options on purpose:
 * `ignore_unavailable` silently drops unreadable indices.
 */
export const readableProbe = (target: string): MsearchRequestItem[] => [
  { index: target, allow_partial_search_results: false },
  { size: 0, terminate_after: 1, track_total_hits: false, query: { match_all: {} } },
];

/** Single expression only: `existing,missing` is also a 404 and says nothing about `existing`. */
const isMissingIndex = (target: string, item: MsearchResponseItem): boolean =>
  !target.includes(',') && 'error' in item && item.error.type === 'index_not_found_exception';

/**
 * Why the probe cannot vouch for `target`: an error, a timeout, or a failed shard. `undefined` when
 * the caller may read it, or when it does not exist yet — a backing store that was never created
 * counts as readable, because the AI Index may have only just been registered.
 */
export const readableProbeFailure = (
  target: string,
  item: MsearchResponseItem
): string | undefined => {
  if (isMissingIndex(target, item)) {
    return undefined;
  }
  if ('error' in item) {
    return item.error.reason ?? item.error.type;
  }
  if (item.timed_out) {
    return 'timed out';
  }
  if (item._shards.failed > 0) {
    return `${item._shards.failed} shard(s) failed`;
  }
  return undefined;
};
