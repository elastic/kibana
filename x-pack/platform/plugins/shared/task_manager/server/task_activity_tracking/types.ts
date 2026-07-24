/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The namespaced fields merged into the per-run event-log document under `kibana.task.run`.
 */
export interface TaskActivityRunFields {
  /** Summed on-CPU time across the run's async callbacks (processing). */
  active_ms: number;
  /** `wall_ms - active_ms`: time holding a worker slot while off-CPU. */
  idle_ms: number;
  /** `active_ms / wall_ms` (0-1). Near 0 ⇒ the task did almost no work while holding a slot. */
  active_ratio: number;
  /** Longest stretch with no on-CPU activity while the run was in-flight. */
  longest_idle_gap_ms: number;
  /**
   * Longest single uninterrupted on-CPU callback: how long the task blocked the event
   * loop in one stretch (nothing else could run). High values indicate synchronous work
   * that should be broken up or offloaded. Contrast with `active_ms` (the sum across all
   * callbacks): the same total spread over many small callbacks does not block the loop.
   */
  longest_event_loop_block_ms: number;
  /** Number of async callbacks executed for the run (poll loops show many tiny ones). */
  callbacks: number;
  /**
   * The largest `heapUsed` growth observed within a single async callback —
   * i.e. up to how much memory the task allocated in one on-CPU stretch. Attributed to
   * the task by measuring heap growth strictly inside its own callbacks; because the
   * event loop runs callbacks serially, this is isolated from concurrently running tasks
   * (they allocate inside their own callbacks). Measures allocation, not retained heap,
   * and does not include off-heap/native memory (e.g. Buffers).
   */
  max_memory_per_callback_bytes: number;
}
