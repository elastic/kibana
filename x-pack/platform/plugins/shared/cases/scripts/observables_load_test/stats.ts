/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

export interface LatencyStats {
  count: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

const round = (value: number): number => Math.round(value * 10) / 10;

const percentile = (sorted: number[], fraction: number): number =>
  sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)] ?? 0;

/** Latency percentiles in milliseconds. */
export const summarize = (samples: number[]): LatencyStats => {
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    mean: round(sorted.length > 0 ? total / sorted.length : 0),
    p50: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    p99: round(percentile(sorted, 0.99)),
    max: round(sorted[sorted.length - 1] ?? 0),
  };
};

export const timed = async <T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> => {
  const start = performance.now();
  const result = await fn();
  return { result, ms: performance.now() - start };
};

/** Runs `fn` `count` times one after another and summarizes the latencies. */
export const sample = async (count: number, fn: () => Promise<unknown>): Promise<LatencyStats> => {
  const samples: number[] = [];
  for (let run = 0; run < count; run++) {
    const { ms } = await timed(fn);
    samples.push(ms);
  }
  return summarize(samples);
};

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
