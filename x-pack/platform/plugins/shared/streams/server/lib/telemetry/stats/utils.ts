/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { isInheritLifecycle } from '@kbn/streams-schema';

/**
 * If stream does not have a `IngestStreamLifecycleInherit`, retention has been changed
 */
export function hasChangedRetention(lifecycle: IngestStreamLifecycle | undefined): boolean {
  return lifecycle !== undefined && !isInheritLifecycle(lifecycle);
}

/**
 * Calculates percentiles from an array of numbers
 * @param arr - Array of numbers
 * @param p - Array of percentile values (0-100)
 * @returns Array of percentile values
 */
export function percentiles(arr: number[], p: number[]): number[] {
  const sorted = arr.slice().sort((a, b) => a - b);
  return p.map((percent) => {
    if (sorted.length === 0) {
      return 0;
    }
    const pos = (sorted.length - 1) * (percent / 100);
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  });
}
