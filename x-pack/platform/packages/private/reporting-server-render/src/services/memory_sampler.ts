/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MemorySnapshot {
  rss: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryReport {
  before: MemorySnapshot;
  peak: MemorySnapshot;
  after: MemorySnapshot;
  samples: number;
}

const snapshot = (): MemorySnapshot => {
  const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage();
  return { rss, heapUsed, external, arrayBuffers };
};

/**
 * Samples this process's memory while a report renders. The render runs inside the Kibana
 * server process, so its cost is the process's growth. Each metric's peak is tracked
 * independently (they peak at different moments). RSS is the one to read for the true cost:
 * skia canvases, Takumi and MapLibre Native allocate outside the V8 heap, and a GC drops
 * `heapUsed` after the render while RSS often stays up.
 */
export const startMemorySampler = (intervalMs = 100): (() => MemoryReport) => {
  const before = snapshot();
  const peak = { ...before };
  let samples = 1;
  const sample = () => {
    const current = snapshot();
    samples++;
    for (const key of Object.keys(peak) as Array<keyof MemorySnapshot>) {
      if (current[key] > peak[key]) peak[key] = current[key];
    }
  };
  const timer = setInterval(sample, intervalMs);
  return () => {
    clearInterval(timer);
    sample();
    return { before, peak, after: snapshot(), samples };
  };
};

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);
const signed = (bytes: number) => `${bytes >= 0 ? '+' : ''}${mb(bytes)}`;

/** One line: for each metric, `before -> peak (+spike) -> after (+retained)` in MB. */
export const formatMemoryReport = ({ before, peak, after, samples }: MemoryReport): string => {
  const part = (label: string, key: keyof MemorySnapshot) =>
    `${label} ${mb(before[key])} -> peak ${mb(peak[key])} (${signed(
      peak[key] - before[key]
    )}) -> ` + `after ${mb(after[key])} (${signed(after[key] - before[key])})`;
  return (
    `memory MB: ${part('rss', 'rss')}; ${part('heapUsed', 'heapUsed')}; ` +
    `${part('external', 'external')}; ${part('arrayBuffers', 'arrayBuffers')} [${samples} samples]`
  );
};
