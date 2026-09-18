/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Worker module that allocates `Buffer`s well past any reasonable declared budget, used by
 * `worker_pool_service.test.ts` to prove the cgroup-based hard memory limit catches what a
 * V8 heap cap (`--max-old-space-size`) cannot: `Buffer`/native memory is off-heap and
 * invisible to `resourceLimits`/`--max-old-space-size`, but still counted by the kernel's
 * cgroup `memory.max`. Only meaningful on Linux with cgroups v2 - the integration test
 * skips this fixture's scenario elsewhere.
 */
interface BufferHogInput {
  /** Size, in MB, of each Buffer chunk allocated per iteration. */
  chunkMb: number;
  /** Number of chunks to allocate; each is retained so it can't be GC'd away. */
  iterations: number;
}

// eslint-disable-next-line import/no-default-export
export default async function bufferHog({ chunkMb, iterations }: BufferHogInput): Promise<never> {
  const chunks: Buffer[] = [];
  for (let i = 0; i < iterations; i++) {
    // Buffer.alloc touches every byte (fill(0)), guaranteeing real, resident memory instead
    // of a lazily-committed mapping the kernel could otherwise avoid charging immediately.
    chunks.push(Buffer.alloc(chunkMb * 1024 * 1024, 1));
    // Yield so the RSS growth is observable/killable between allocations rather than all at
    // once in a single synchronous burst.
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  // Should never get here under the intended budget - the kernel OOM-kills the process first.
  throw new Error(`buffer_hog_worker allocated ${iterations * chunkMb}MB without being killed`);
}
