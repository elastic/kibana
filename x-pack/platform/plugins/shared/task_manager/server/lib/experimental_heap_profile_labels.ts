/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Experimental: attribute Task Manager allocations via Node heap-profile labels.
 * No-op unless KBN_HEAP_PROFILE_LABELS=1 and the custom Node API exists.
 * Label cardinality is bounded to registered task types — never task.id.
 */

import v8 from 'v8';

export const HEAP_PROFILE_LABELS_ENV = 'KBN_HEAP_PROFILE_LABELS';
export const TASK_TYPE_LABEL_KEY = 'task.type';

interface HeapProfileLabelsApi {
  withHeapProfileLabels?: <T>(labels: Record<string, string>, fn: () => T) => T;
  setHeapProfileLabels?: (labels: Record<string, string>) => void;
  startHeapProfile?: (options: { labels?: boolean; sampleInterval?: number }) => unknown;
}

const heapProfileApi = v8 as unknown as HeapProfileLabelsApi;

let profileSessionStarted = false;

export function isHeapProfileLabelsEnabled(): boolean {
  return process.env[HEAP_PROFILE_LABELS_ENV] === '1';
}

export function hasHeapProfileLabelsApi(): boolean {
  return typeof heapProfileApi.withHeapProfileLabels === 'function';
}

/**
 * Starts a labels-enabled heap profile once so scrapes can attribute live bytes.
 * Safe to call when the API is absent — returns false.
 */
export function maybeStartHeapProfile(): boolean {
  if (profileSessionStarted || !isHeapProfileLabelsEnabled() || !hasHeapProfileLabelsApi()) {
    return false;
  }
  if (typeof heapProfileApi.startHeapProfile !== 'function') {
    return false;
  }
  heapProfileApi.startHeapProfile({ labels: true, sampleInterval: 64 * 1024 });
  profileSessionStarted = true;
  return true;
}

/**
 * Wraps a Task Manager `run()` invocation with `{ 'task.type': taskType }`.
 * `run()` is awaited by the caller, so withHeapProfileLabels covers the async body.
 */
export function withTaskTypeHeapProfileLabels<T>(taskType: string, run: () => T): T {
  if (!isHeapProfileLabelsEnabled() || !hasHeapProfileLabelsApi()) {
    return run();
  }
  maybeStartHeapProfile();
  const withLabels = heapProfileApi.withHeapProfileLabels;
  if (typeof withLabels !== 'function') {
    return run();
  }
  return withLabels({ [TASK_TYPE_LABEL_KEY]: String(taskType) }, run);
}
