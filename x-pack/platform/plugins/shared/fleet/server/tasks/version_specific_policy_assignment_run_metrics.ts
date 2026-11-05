/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MEMORY_SAMPLING_INTERVAL_MS = 100;
const MB = 1024 * 1024;

const toMb = (bytes: number) => Math.round((bytes / MB) * 10) / 10;

/**
 * Measures the duration of a task run, of its phases, and the memory of the Kibana process during the
 * run. The memory is process wide (other tasks and requests included) and sampled, so the peak is an
 * indication to compare runs with, not an exact allocation of the task.
 */
export class RunMetrics {
  private readonly startedAt = process.hrtime.bigint();
  private readonly startMemory = process.memoryUsage();
  private peakHeapUsed = this.startMemory.heapUsed;
  private peakRss = this.startMemory.rss;
  private readonly phaseDurationsMs: Record<string, number> = {};
  private readonly sampler: NodeJS.Timeout;

  constructor() {
    this.sampler = setInterval(() => this.sampleMemory(), MEMORY_SAMPLING_INTERVAL_MS);
    // never keep the process alive (there is no unref in the jsdom test environment)
    this.sampler.unref?.();
  }

  private sampleMemory() {
    const { heapUsed, rss } = process.memoryUsage();
    this.peakHeapUsed = Math.max(this.peakHeapUsed, heapUsed);
    this.peakRss = Math.max(this.peakRss, rss);
  }

  public async measurePhase<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const phaseStartedAt = process.hrtime.bigint();
    try {
      return await fn();
    } finally {
      this.phaseDurationsMs[name] =
        (this.phaseDurationsMs[name] ?? 0) + Number(process.hrtime.bigint() - phaseStartedAt) / 1e6;
    }
  }

  public stop() {
    clearInterval(this.sampler);
    this.sampleMemory();
    const endMemory = process.memoryUsage();
    return {
      durationMs: Math.round(Number(process.hrtime.bigint() - this.startedAt) / 1e6),
      phaseDurationsMs: Object.fromEntries(
        Object.entries(this.phaseDurationsMs).map(([name, ms]) => [name, Math.round(ms)])
      ),
      heapUsedMbAtStart: toMb(this.startMemory.heapUsed),
      heapUsedMbAtEnd: toMb(endMemory.heapUsed),
      heapUsedMbPeak: toMb(this.peakHeapUsed),
      heapUsedMbPeakIncrease: toMb(this.peakHeapUsed - this.startMemory.heapUsed),
      rssMbAtStart: toMb(this.startMemory.rss),
      rssMbPeak: toMb(this.peakRss),
    };
  }
}
