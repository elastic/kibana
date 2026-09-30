/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Experimental: attribute Task Manager allocations via Node heap-profile labels.
 * On when `v8.withHeapProfileLabels` exists; opt out with KBN_HEAP_PROFILE_LABELS=0.
 * Label cardinality is bounded to registered task types — never task.id.
 */

import v8 from 'v8';

export const HEAP_PROFILE_LABELS_ENV = 'KBN_HEAP_PROFILE_LABELS';
export const TASK_TYPE_LABEL_KEY = 'task.type';
export const HEAP_PROFILE_SAMPLE_INTERVAL_BYTES = 64 * 1024;

export interface HeapProfileSample {
  readonly size?: number;
  readonly count?: number;
  readonly labels?: Record<string, string>;
}

export interface HeapProfileExternalBytes {
  readonly labels?: Record<string, string>;
  readonly bytes?: number;
}

export interface HeapAllocationProfile {
  readonly samples?: HeapProfileSample[];
  readonly externalBytes?: HeapProfileExternalBytes[];
}

export interface HeapProfileHandle {
  getAllocationProfile?: () => HeapAllocationProfile | undefined;
  stop?: () => void;
}

interface HeapProfileLabelsApi {
  withHeapProfileLabels?: <T>(labels: Record<string, string>, fn: () => T) => T;
  setHeapProfileLabels?: (labels: Record<string, string>) => void;
  startHeapProfile?: (options: {
    labels?: boolean;
    sampleInterval?: number;
  }) => HeapProfileHandle | undefined;
}

const heapProfileApi = v8 as unknown as HeapProfileLabelsApi;

let profileHandle: HeapProfileHandle | undefined;

export function hasHeapProfileLabelsApi(): boolean {
  return typeof heapProfileApi.withHeapProfileLabels === 'function';
}

export function isHeapProfileLabelsEnabled(): boolean {
  return process.env[HEAP_PROFILE_LABELS_ENV] !== '0' && hasHeapProfileLabelsApi();
}

export function getHeapProfileHandle(): HeapProfileHandle | undefined {
  return profileHandle;
}

/**
 * Starts a labels-enabled heap profile once so scrapes can attribute live bytes.
 * Safe to call when the API is absent — returns false.
 */
export function maybeStartHeapProfile(): boolean {
  if (profileHandle || !isHeapProfileLabelsEnabled()) {
    return false;
  }
  if (typeof heapProfileApi.startHeapProfile !== 'function') {
    return false;
  }
  profileHandle = heapProfileApi.startHeapProfile({
    labels: true,
    sampleInterval: HEAP_PROFILE_SAMPLE_INTERVAL_BYTES,
  });
  return profileHandle !== undefined;
}

/**
 * Stops the heap-profile session if the handle exposes `stop()`.
 */
export function maybeStopHeapProfile(): void {
  const handle = profileHandle;
  profileHandle = undefined;
  if (handle && typeof handle.stop === 'function') {
    handle.stop();
  }
}

/**
 * Wraps a Task Manager `run()` invocation with `{ 'task.type': taskType }`.
 * `run()` is awaited by the caller, so withHeapProfileLabels covers the async body.
 */
export function withTaskTypeHeapProfileLabels<T>(taskType: string, run: () => T): T {
  if (!isHeapProfileLabelsEnabled()) {
    return run();
  }
  maybeStartHeapProfile();
  const withLabels = heapProfileApi.withHeapProfileLabels;
  if (typeof withLabels !== 'function') {
    return run();
  }
  return withLabels({ [TASK_TYPE_LABEL_KEY]: String(taskType) }, run);
}
