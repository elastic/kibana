/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scrapes a labels-enabled heap profile and exports per-task.type gauges on
 * Kibana's global OTel meter (scope `nodejs.heap_profile`).
 */

import type { BatchObservableResult, Meter, ObservableGauge } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';
import type { Logger } from '@kbn/core/server';
import type { HeapAllocationProfile } from './experimental_heap_profile_labels';
import {
  getHeapProfileHandle,
  isHeapProfileLabelsEnabled,
  maybeStartHeapProfile,
  maybeStopHeapProfile,
  TASK_TYPE_LABEL_KEY,
} from './experimental_heap_profile_labels';

export const HEAP_PROFILE_METER_NAME = 'nodejs.heap_profile';
export const HEAP_PROFILE_LIVE_METRIC = 'nodejs.heap_profile.live';
export const HEAP_PROFILE_SAMPLE_COUNT_METRIC = 'nodejs.heap_profile.sample.count';
export const HEAP_PROFILE_SCRAPE_DURATION_METRIC = 'nodejs.heap_profile.scrape.duration';

export const UNLABELED = '_unlabeled';
export const OTHER = '_other';
export const TOP_N = 256;

export type MemorySource = 'exact' | 'sampled_heap';

export interface HeapProfileLiveRow {
  readonly taskType: string;
  readonly source: MemorySource;
  readonly bytes: number;
}

export interface HeapProfileSampleCountRow {
  readonly taskType: string;
  readonly count: number;
}

export interface HeapProfileSnapshot {
  readonly live: HeapProfileLiveRow[];
  readonly sampleCount: HeapProfileSampleCountRow[];
  readonly scrapeDurationMs: number;
}

export interface HeapProfileLabelsMetrics {
  stop: () => void;
}

const addToMap = (map: Map<string, number>, key: string, n: number): void => {
  map.set(key, (map.get(key) ?? 0) + n);
};

export const taskTypeFromLabels = (labels: Record<string, string> | undefined): string => {
  if (!labels) {
    return UNLABELED;
  }
  const value = labels[TASK_TYPE_LABEL_KEY];
  if (typeof value !== 'string' || value.length === 0) {
    return UNLABELED;
  }
  return value;
};

export const aggregateProfile = (
  profile: HeapAllocationProfile
): {
  external: Map<string, number>;
  sampled: Map<string, number>;
  sampleCounts: Map<string, number>;
} => {
  const external = new Map<string, number>();
  const sampled = new Map<string, number>();
  const sampleCounts = new Map<string, number>();

  for (const row of profile.externalBytes ?? []) {
    addToMap(external, taskTypeFromLabels(row.labels), Number(row.bytes) || 0);
  }
  for (const sample of profile.samples ?? []) {
    const key = taskTypeFromLabels(sample.labels);
    addToMap(sampled, key, (Number(sample.size) || 0) * (Number(sample.count) || 0));
    addToMap(sampleCounts, key, Number(sample.count) || 0);
  }

  return { external, sampled, sampleCounts };
};

export const collapseTopN = (map: Map<string, number>, n = TOP_N): Map<string, number> => {
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length <= n) {
    return new Map(entries);
  }
  const kept = new Map(entries.slice(0, n));
  let other = 0;
  for (const [, value] of entries.slice(n)) {
    other += value;
  }
  if (other > 0) {
    kept.set(OTHER, (kept.get(OTHER) ?? 0) + other);
  }
  return kept;
};

export const snapshotFromProfile = (
  profile: HeapAllocationProfile | undefined,
  durationMs: number
): HeapProfileSnapshot => {
  if (profile === undefined) {
    return { live: [], sampleCount: [], scrapeDurationMs: durationMs };
  }
  const { external, sampled, sampleCounts } = aggregateProfile(profile);
  const live: HeapProfileLiveRow[] = [];
  for (const [taskType, bytes] of collapseTopN(external)) {
    live.push({ taskType, source: 'exact', bytes });
  }
  for (const [taskType, bytes] of collapseTopN(sampled)) {
    live.push({ taskType, source: 'sampled_heap', bytes });
  }
  const sampleCount = [...collapseTopN(sampleCounts)].map(([taskType, count]) => ({
    taskType,
    count,
  }));
  return { live, sampleCount, scrapeDurationMs: durationMs };
};

const scrapeAllocationProfile = (): HeapProfileSnapshot => {
  const handle = getHeapProfileHandle();
  const start = process.hrtime.bigint();
  const profile =
    handle && typeof handle.getAllocationProfile === 'function'
      ? handle.getAllocationProfile()
      : undefined;
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
  return snapshotFromProfile(profile, durationMs);
};

const observeSnapshot = (
  result: BatchObservableResult,
  snapshot: HeapProfileSnapshot,
  liveGauge: ObservableGauge,
  sampleCountGauge: ObservableGauge,
  scrapeDurationGauge: ObservableGauge
): void => {
  for (const row of snapshot.live) {
    result.observe(liveGauge, row.bytes, {
      'task.type': row.taskType,
      'memory.source': row.source,
    });
  }
  for (const row of snapshot.sampleCount) {
    result.observe(sampleCountGauge, row.count, { 'task.type': row.taskType });
  }
  result.observe(scrapeDurationGauge, snapshot.scrapeDurationMs);
};

/**
 * Starts a heap-profile session and registers observable gauges on the global meter.
 * No-op when the labels API is absent or opted out. Never throws.
 */
export const startHeapProfileLabelsMetrics = (
  logger: Logger,
  options?: { meter?: Meter }
): HeapProfileLabelsMetrics | undefined => {
  try {
    if (!isHeapProfileLabelsEnabled()) {
      return undefined;
    }
    maybeStartHeapProfile();
    const handle = getHeapProfileHandle();
    if (!handle || typeof handle.getAllocationProfile !== 'function') {
      logger.warn(
        'Heap profile labels are enabled but startHeapProfile() did not return a scrape handle'
      );
      return { stop: () => maybeStopHeapProfile() };
    }

    const meter = options?.meter ?? metrics.getMeter(HEAP_PROFILE_METER_NAME);
    const liveGauge = meter.createObservableGauge(HEAP_PROFILE_LIVE_METRIC, {
      description:
        'Live bytes attributed to a Task Manager task type (exact external vs sampled heap).',
      unit: 'By',
      valueType: ValueType.INT,
    });
    const sampleCountGauge = meter.createObservableGauge(HEAP_PROFILE_SAMPLE_COUNT_METRIC, {
      description: 'Count of live heap-profile samples attributed to a task type.',
      unit: '{sample}',
      valueType: ValueType.INT,
    });
    const scrapeDurationGauge = meter.createObservableGauge(HEAP_PROFILE_SCRAPE_DURATION_METRIC, {
      description: 'Wall time of the last getAllocationProfile() scrape.',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });

    let loggedScrapeFailure = false;
    const callback = (result: BatchObservableResult) => {
      try {
        observeSnapshot(
          result,
          scrapeAllocationProfile(),
          liveGauge,
          sampleCountGauge,
          scrapeDurationGauge
        );
      } catch (err) {
        if (!loggedScrapeFailure) {
          loggedScrapeFailure = true;
          logger.warn(
            `Heap profile labels scrape failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    };

    meter.addBatchObservableCallback(callback, [liveGauge, sampleCountGauge, scrapeDurationGauge]);

    return {
      stop: () => {
        try {
          meter.removeBatchObservableCallback(callback, [
            liveGauge,
            sampleCountGauge,
            scrapeDurationGauge,
          ]);
        } catch (err) {
          logger.debug(
            `Failed to unregister heap profile labels metrics: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        maybeStopHeapProfile();
      },
    };
  } catch (err) {
    logger.warn(
      `Failed to start heap profile labels metrics: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
};
