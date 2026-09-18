/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Worker module that grows the *JS heap* (many small plain objects held in an array) well
 * past any reasonable declared budget, used by `worker_pool_service.test.ts` to prove the
 * portable `--max-old-space-size` heap cap enforces everywhere (no cgroups required): the
 * process crashes with a V8 "JavaScript heap out of memory" fatal error, which
 * `WorkerPoolService` surfaces as an unexpected-exit rejection.
 *
 * Deliberately allocates many small objects rather than one or a few large strings/Buffers:
 * V8 backs sufficiently large flat strings and all `Buffer`/`ArrayBuffer` data with
 * externally-malloc'd memory that does NOT count against `--max-old-space-size` at all -
 * small object/array allocations are what actually land in, and fill, the old-space heap
 * this flag caps.
 */
interface HeapHogInput {
  iterations: number;
}

// eslint-disable-next-line import/no-default-export
export default function heapHog({ iterations }: HeapHogInput): never {
  const objects: Array<Record<string, unknown>> = [];
  for (let i = 0; i < iterations; i++) {
    objects.push({ a: i, b: i * 2, c: 'abcdefgh', d: [1, 2, 3, 4, 5] });
  }
  // Should never get here under a small heap cap - V8 aborts the process first.
  throw new Error(`heap_hog_worker allocated ${iterations} objects without hitting the heap cap`);
}
