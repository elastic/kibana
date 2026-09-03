/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scrapes a labels-enabled heap profile and exports per-task.type and
 * per-http.route gauges on Kibana's global OTel meter (scope `nodejs.heap_profile`).
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

export const HTTP_ROUTE_LABEL_KEY = 'http.route';
export const HTTP_REQUEST_METHOD_LABEL_KEY = 'http.request.method';
export const ROUTE_KEY_SEPARATOR = '\0';

export type MemorySource = 'exact' | 'sampled_heap';

export interface HeapProfileLiveRow {
  readonly source: MemorySource;
  readonly bytes: number;
  readonly taskType?: string;
  readonly httpRoute?: string;
  readonly httpRequestMethod?: string;
}

export interface HeapProfileSampleCountRow {
  readonly count: number;
  readonly taskType?: string;
  readonly httpRoute?: string;
  readonly httpRequestMethod?: string;
}

export interface HeapProfileDimensionMaps {
  readonly external: Map<string, number>;
  readonly sampled: Map<string, number>;
  readonly sampleCounts: Map<string, number>;
}

export interface HeapProfileAggregates {
  readonly task: HeapProfileDimensionMaps;
  readonly route: HeapProfileDimensionMaps;
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

export const routeKey = (route: string, method: string): string => {
  return `${route}${ROUTE_KEY_SEPARATOR}${method}`;
};

export const parseRouteKey = (key: string): { httpRoute: string; httpRequestMethod: string } => {
  if (key === OTHER) {
    return { httpRoute: OTHER, httpRequestMethod: OTHER };
  }
  const sep = key.indexOf(ROUTE_KEY_SEPARATOR);
  if (sep === -1) {
    return { httpRoute: key, httpRequestMethod: UNLABELED };
  }
  return { httpRoute: key.slice(0, sep), httpRequestMethod: key.slice(sep + 1) };
};

export const dimensionFromLabels = (
  labels: Record<string, string> | undefined
): { kind: 'route' | 'task'; key: string } => {
  const route = labels?.[HTTP_ROUTE_LABEL_KEY];
  if (typeof route === 'string' && route.length > 0) {
    const method = labels?.[HTTP_REQUEST_METHOD_LABEL_KEY];
    const normalizedMethod = typeof method === 'string' && method.length > 0 ? method : UNLABELED;
    return { kind: 'route', key: routeKey(route, normalizedMethod) };
  }
  return { kind: 'task', key: taskTypeFromLabels(labels) };
};

const emptyDimensionMaps = (): HeapProfileDimensionMaps => ({
  external: new Map<string, number>(),
  sampled: new Map<string, number>(),
  sampleCounts: new Map<string, number>(),
});

export const aggregateProfile = (profile: HeapAllocationProfile): HeapProfileAggregates => {
  const task = emptyDimensionMaps();
  const route = emptyDimensionMaps();
  const bucket = (kind: 'route' | 'task'): HeapProfileDimensionMaps =>
    kind === 'route' ? route : task;

  for (const row of profile.externalBytes ?? []) {
    const dim = dimensionFromLabels(row.labels);
    addToMap(bucket(dim.kind).external, dim.key, Number(row.bytes) || 0);
  }
  for (const sample of profile.samples ?? []) {
    const dim = dimensionFromLabels(sample.labels);
    const group = bucket(dim.kind);
    addToMap(group.sampled, dim.key, (Number(sample.size) || 0) * (Number(sample.count) || 0));
    addToMap(group.sampleCounts, dim.key, Number(sample.count) || 0);
  }

  return { task, route };
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
  const { task, route } = aggregateProfile(profile);
  const live: HeapProfileLiveRow[] = [];
  const sampleCount: HeapProfileSampleCountRow[] = [];
  for (const [taskType, bytes] of collapseTopN(task.external)) {
    live.push({ taskType, source: 'exact', bytes });
  }
  for (const [taskType, bytes] of collapseTopN(task.sampled)) {
    live.push({ taskType, source: 'sampled_heap', bytes });
  }
  for (const [key, bytes] of collapseTopN(route.external)) {
    live.push({ ...parseRouteKey(key), source: 'exact', bytes });
  }
  for (const [key, bytes] of collapseTopN(route.sampled)) {
    live.push({ ...parseRouteKey(key), source: 'sampled_heap', bytes });
  }
  for (const [taskType, count] of collapseTopN(task.sampleCounts)) {
    sampleCount.push({ taskType, count });
  }
  for (const [key, count] of collapseTopN(route.sampleCounts)) {
    sampleCount.push({ ...parseRouteKey(key), count });
  }
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
    if (row.httpRoute !== undefined) {
      result.observe(liveGauge, row.bytes, {
        'http.route': row.httpRoute,
        'http.request.method': row.httpRequestMethod ?? UNLABELED,
        'memory.source': row.source,
      });
    } else {
      result.observe(liveGauge, row.bytes, {
        'task.type': row.taskType ?? UNLABELED,
        'memory.source': row.source,
      });
    }
  }
  for (const row of snapshot.sampleCount) {
    if (row.httpRoute !== undefined) {
      result.observe(sampleCountGauge, row.count, {
        'http.route': row.httpRoute,
        'http.request.method': row.httpRequestMethod ?? UNLABELED,
      });
    } else {
      result.observe(sampleCountGauge, row.count, { 'task.type': row.taskType ?? UNLABELED });
    }
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
        'Live bytes attributed to a Task Manager task type or HTTP route (exact external vs sampled heap).',
      unit: 'By',
      valueType: ValueType.INT,
    });
    const sampleCountGauge = meter.createObservableGauge(HEAP_PROFILE_SAMPLE_COUNT_METRIC, {
      description: 'Count of live heap-profile samples attributed to a task type or HTTP route.',
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
