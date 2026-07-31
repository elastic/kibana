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
  /** On-CPU time attributed to the run: its own callbacks plus `sync_ms`. */
  active_ms: number;
  /** `wall_ms - active_ms`: time holding a worker slot without attributed on-CPU work. */
  idle_ms: number;
  /** `active_ms / wall_ms` (0-1). Near 0 ⇒ the task did almost no attributed work while holding a slot. */
  active_ratio: number;
  /** Longest stretch with no on-CPU activity while the run was in-flight. */
  longest_idle_gap_ms: number;
  /**
   * Longest single uninterrupted on-CPU stretch: how long the task blocked the event
   * loop in one go (nothing else could run). Measured on the outermost callback of the
   * run, so nested callbacks are included rather than replacing it. Contrast with
   * `active_ms` (the sum across all callbacks): the same total spread over many small
   * callbacks does not block the loop.
   */
  longest_event_loop_block_ms: number;
  /** Number of outermost (non-nested) callbacks executed for the run. */
  callbacks: number;
  /**
   * On-CPU time spent in `run()` before it yielded for the first time. This work
   * executes in the caller's callback rather than the run's own, so it is measured at
   * the call site instead of by the async hook.
   */
  sync_ms: number;
  /**
   * Longest event-loop block observed process-wide during the run, from
   * `perf_hooks.monitorEventLoopDelay`. Accurate but not attributable, so it serves as
   * an upper bound for `longest_event_loop_block_ms`.
   */
  event_loop_delay_max_ms: number;
  /**
   * `event_loop_delay_max_ms - longest_event_loop_block_ms`: blocking that happened
   * during the run but could not be attributed to it. On a node running a single task
   * this is blocking the accounting missed; with concurrent runs it may belong to
   * another task.
   */
  unattributed_block_ms: number;
  /**
   * Process-wide CPU time consumed while this run was in flight. This is an upper bound
   * for the run's CPU use: concurrent tasks and worker threads can increase it.
   */
  process_cpu_ms: number;
  /**
   * `process_cpu_ms - active_ms`: process CPU observed during the run that this tracker
   * did not attribute to it. With concurrent runs this may belong to another task.
   */
  unattributed_cpu_ms: number;
  /**
   * Largest positive V8 heap growth observed within one callback. Present only when
   * `track_heap_growth` is enabled. This is a GC-sensitive allocation heuristic, not
   * retained or total task memory.
   */
  max_heap_growth_per_callback_bytes?: number;
}
