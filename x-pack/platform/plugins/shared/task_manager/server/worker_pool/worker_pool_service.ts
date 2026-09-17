/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/logging';
import type { WorkerThreadsConfig } from '../config';
import { WorkerPoolAtCapacityError } from './errors';
import type { TaskWorkerPayload, WorkerPoolRunOptions } from './types';

export type { TaskWorkerPayload, WorkerPoolRunOptions } from './types';
export { WorkerPoolAtCapacityError } from './errors';

/**
 * Runs task work in a shared pool of Node.js worker threads (via Piscina), so long-running
 * or CPU-bound task work doesn't block Task Manager's own event loop.
 *
 * Threads are the CPU dimension: one in-flight run occupies one thread (~one core), capped
 * by `max_threads` - Node has no finer-grained per-thread CPU quota. Memory is tracked
 * separately as a reservation ledger against `max_total_memory_mb`: every `run()` call must
 * declare its `memoryMb` requirement upfront, which is reserved for the duration of the run
 * and released when it settles. This lets Task Manager check, before claiming or dispatching
 * a worker task, whether there is room to run another task with its declared requirements.
 *
 * The pool itself is created with a pool-wide `maxOldGenerationSizeMb` heap cap
 * (`max_task_heap_mb`), so a task that exceeds its declared memory OOMs its own thread
 * instead of the main Kibana process. This is a blunt, pool-wide backstop: it does not give
 * each task its own hard limit (that would require a dedicated `Worker` per task).
 */
export class WorkerPoolService {
  private readonly config: WorkerThreadsConfig;
  private readonly logger: Logger;
  private pool?: Piscina;
  private reservedMemoryMb = 0;

  constructor(config: WorkerThreadsConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  public get enabled(): boolean {
    return this.config.enabled;
  }

  public start(): void {
    if (!this.config.enabled) {
      return;
    }
    this.pool = this.createPool();
  }

  private createPool(): Piscina {
    this.logger.debug(
      `Initializing task manager worker pool (maxThreads=${
        this.config.max_threads
      } maxTotalMemoryMb=${this.config.max_total_memory_mb} maxTaskHeapMb=${
        this.config.max_task_heap_mb
      } idleTimeout=${this.config.idle_timeout.asMilliseconds()}ms)`
    );
    return new Piscina({
      filename: require.resolve('./task_worker_wrapper.js'),
      maxThreads: this.config.max_threads,
      idleTimeout: this.config.idle_timeout.asMilliseconds(),
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.max_task_heap_mb,
      },
    });
  }

  /**
   * The remaining memory budget (MB) not currently reserved by in-flight runs.
   */
  public get availableMemoryMb(): number {
    return Math.max(0, this.config.max_total_memory_mb - this.reservedMemoryMb);
  }

  /**
   * Whether a run declaring `memoryMb` could be admitted right now. Used at claim time to
   * avoid claiming worker tasks that have nowhere to run this cycle; the reservation
   * performed by `run()` remains the authoritative gate since it may race with other
   * reservations (e.g. concurrent `runInWorker` calls) made between the check and dispatch.
   */
  public hasCapacityFor(memoryMb: number): boolean {
    return this.enabled && memoryMb <= this.availableMemoryMb;
  }

  /**
   * Executes `moduleId`'s default export with `input` in a worker thread. Reserves
   * `memoryMb` from the shared budget for the duration of the run, releasing it when the
   * run settles (success, failure, or abort). Throws {@link WorkerPoolAtCapacityError}
   * immediately, without queueing, if the reservation does not fit the current budget.
   */
  public async run<TResult = unknown>(
    moduleId: string,
    input: unknown,
    { memoryMb, signal }: WorkerPoolRunOptions
  ): Promise<TResult> {
    if (!this.enabled || !this.pool) {
      throw new Error('Task manager worker pool is not enabled');
    }

    if (memoryMb > this.availableMemoryMb) {
      throw new WorkerPoolAtCapacityError(memoryMb, this.availableMemoryMb);
    }

    this.reservedMemoryMb += memoryMb;
    try {
      const payload: TaskWorkerPayload = { moduleId, input };
      return await this.pool.run(payload, signal ? { signal } : undefined);
    } catch (err) {
      if (err?.name === 'AbortError') {
        // The pool may be left in a degraded state after an abort-driven thread
        // termination; recreate it so later runs don't land on a tainted pool.
        await this.pool.destroy().catch(() => {});
        this.pool = this.createPool();
      }
      throw err;
    } finally {
      this.reservedMemoryMb -= memoryMb;
    }
  }

  public async stop(): Promise<void> {
    await this.pool?.destroy();
  }
}
