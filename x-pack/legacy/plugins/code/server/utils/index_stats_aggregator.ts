/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexStats, IndexStatsKey } from '../../model';

export function aggregateIndexStats(stats: IndexStats[]): IndexStats {
  const res = new Map<IndexStatsKey, number>()
    .set(IndexStatsKey.File, 0)
    .set(IndexStatsKey.Symbol, 0)
    .set(IndexStatsKey.Reference, 0);
  stats.forEach((s: IndexStats) => {
    s.forEach((value: number, key: IndexStatsKey) => {
      res.set(key, res.get(key)! + value);
    });
  });
  return res;
}
