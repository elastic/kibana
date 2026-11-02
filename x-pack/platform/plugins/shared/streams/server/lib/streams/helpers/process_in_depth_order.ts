/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';

/**
 * Processes items in depth-descending order: deepest items first, shallowest last.
 * Items at the same depth level are processed in parallel by default, or
 * sequentially when `sequential: true` is passed.
 *
 * This is essential when parent items reference children (e.g. ingest pipelines,
 * ES|QL views) — children must exist before parents are created.
 */
export async function processInDepthOrder<T>(
  items: T[],
  getDepth: (item: T) => number,
  processFn: (item: T) => Promise<unknown>,
  options?: { sequential?: boolean }
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const itemsWithDepth = items.map((item) => ({ item, depth: getDepth(item) }));
  const byDepth = groupBy(itemsWithDepth, 'depth');
  const depths = Object.keys(byDepth)
    .map(Number)
    .sort((a, b) => b - a);

  for (const depth of depths) {
    if (options?.sequential) {
      for (const { item } of byDepth[depth]) {
        await processFn(item);
      }
    } else {
      await Promise.all(byDepth[depth].map(({ item }) => processFn(item)));
    }
  }
}
