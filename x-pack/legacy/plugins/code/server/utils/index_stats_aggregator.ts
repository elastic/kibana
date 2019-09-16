/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexStats, IndexStatsKey } from '../../model';

export function aggregateIndexStats(stats: IndexStats[]): IndexStats {
  const res = new Map<IndexStatsKey, number>();
  stats.forEach((s: IndexStats) => {
    s.forEach((value: number, key: IndexStatsKey) => {
      if (!res.has(key)) {
        res.set(key, 0);
      }
      res.set(key, res.get(key)! + value);
    });
  });

  return res;
}
