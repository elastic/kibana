/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import type { Logger } from '@kbn/core/server';
import type {
  IsolatedTaskClass,
  IsolatedTaskRequest,
  IsolatedTaskResult,
} from './isolated_task_protocol';

import type { StopReason } from './isolated_task_terminated_error';
import { IsolatedTaskTerminatedError } from './isolated_task_terminated_error';

interface PoolEntry {
  readonly pool: Piscina<IsolatedTaskRequest, IsolatedTaskResult>;
  readonly active: Set<string>;
  reset?: Promise<void>;
  reason?: StopReason;
  initiatingRun?: string;
  discarded?: readonly string[];
}

/** Research-only, per-class pools; Task Manager retains all admission and persistence authority. */
export class IsolatedTaskExecutor {
  private readonly pools = new Map<IsolatedTaskClass, PoolEntry>();
  private closing = false;

  constructor(private readonly maxThreads: number, private readonly logger: Logger) {}

  public async run(
    workloadClass: IsolatedTaskClass,
    request: IsolatedTaskRequest,
    {
      executionId,
      signal,
      killAfterMs = 30000,
    }: { executionId: string; signal: AbortSignal; killAfterMs?: number }
  ): Promise<IsolatedTaskResult> {
    if (signal.aborted) throw new IsolatedTaskTerminatedError('cancelled', [], false);
    const entry = await this.getPool(workloadClass);
    if (this.closing) throw new Error('Isolated executor is stopping');
    if (signal.aborted) throw new IsolatedTaskTerminatedError('cancelled', [], false);
    if (entry.active.has(executionId)) throw new Error('Duplicate isolated execution ID');
    entry.active.add(executionId);
    const controller = new AbortController();
    const stop = (reason: StopReason) => {
      void this.resetPool(workloadClass, entry, reason, executionId).catch((error: Error) => {
        this.logger.error(error);
      });
      controller.abort();
    };
    const onAbort = () => stop('cancelled');
    signal.addEventListener('abort', onAbort, { once: true });
    const timer =
      killAfterMs === undefined ? undefined : setTimeout(() => stop('deadline'), killAfterMs);
    try {
      const result = await entry.pool.run(request, { signal: controller.signal });
      if (entry.reset) {
        await entry.reset;
        throw this.terminationFor(entry, executionId);
      }
      return result;
    } catch (error) {
      if (entry.reset) {
        await entry.reset;
        throw this.terminationFor(entry, executionId);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      entry.active.delete(executionId);
    }
  }

  public getInfo(): Array<{ workloadClass: IsolatedTaskClass; threads: number; active: number }> {
    return [...this.pools].map(([workloadClass, entry]) => ({
      workloadClass,
      threads: entry.pool.threads.length,
      active: entry.active.size,
    }));
  }

  public async stop(): Promise<void> {
    this.closing = true;
    await Promise.all(
      [...this.pools].map(([workloadClass, entry]) =>
        this.resetPool(workloadClass, entry, 'shutdown', 'plugin-stop')
      )
    );
  }

  private async getPool(workloadClass: IsolatedTaskClass): Promise<PoolEntry> {
    const previous = this.pools.get(workloadClass);
    if (previous?.reset) await previous.reset;
    if (this.closing) throw new Error('Isolated executor is stopping');
    const current = this.pools.get(workloadClass);
    if (current) return current;
    const pool = new Piscina<IsolatedTaskRequest, IsolatedTaskResult>({
      filename: require.resolve('./isolated_task_worker_wrapper.js'),
      minThreads: 0,
      maxThreads: this.maxThreads,
      maxQueue: 10,
      concurrentTasksPerWorker: 1,
      idleTimeout: 60000,
    });
    pool.on('error', (error: Error) => this.logger.error(error));
    const entry: PoolEntry = { pool, active: new Set() };
    this.pools.set(workloadClass, entry);
    return entry;
  }

  private resetPool(
    workloadClass: IsolatedTaskClass,
    entry: PoolEntry,
    reason: StopReason,
    initiatingRun: string
  ): Promise<void> {
    if (entry.reset) return entry.reset;
    entry.reason = reason;
    entry.initiatingRun = initiatingRun;
    entry.discarded = [...entry.active];
    const exits = entry.pool.threads.map((worker) =>
      worker.threadId === -1
        ? Promise.resolve()
        : new Promise<void>((resolve) => worker.once('exit', () => resolve()))
    );
    entry.reset = entry.pool.destroy().then(async () => {
      await Promise.all(exits);
      if (this.pools.get(workloadClass) === entry) this.pools.delete(workloadClass);
    });
    return entry.reset;
  }

  private terminationFor(entry: PoolEntry, executionId: string): IsolatedTaskTerminatedError {
    return new IsolatedTaskTerminatedError(
      entry.reason ?? 'shutdown',
      entry.discarded ?? [],
      entry.initiatingRun !== executionId
    );
  }
}
