/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Read-only memory snapshot for production-shape island accounting. */

import { getHeapSpaceStatistics, getHeapStatistics } from 'v8';

export interface ProcessMemorySample {
  readonly rss: number;
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly arrayBuffers: number;
  readonly v8HeapUsed: number;
  readonly v8HeapTotal: number;
  readonly v8External: number;
  readonly codeSpaceUsed: number;
  readonly codeSpaceSize: number;
  readonly pointerCompression: boolean;
}

/** Samples this isolate's V8 heap plus the process RSS. Does not allocate a heap snapshot. */
export const sampleProcessMemory = (): ProcessMemorySample => {
  const usage = process.memoryUsage();
  const heap = getHeapStatistics();
  const code = getHeapSpaceStatistics().find((space) => space.space_name === 'code_space');
  const variables = (
    process.config as { variables?: { v8_enable_pointer_compression?: number } }
  ).variables;
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
    v8HeapUsed: heap.used_heap_size,
    v8HeapTotal: heap.total_heap_size,
    v8External: heap.external_memory,
    codeSpaceUsed: code?.space_used_size ?? 0,
    codeSpaceSize: code?.space_size ?? 0,
    pointerCompression: variables?.v8_enable_pointer_compression === 1,
  };
};
