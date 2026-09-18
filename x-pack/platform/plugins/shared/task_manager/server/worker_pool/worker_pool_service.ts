/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork } from 'child_process';
import type { ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import type { Logger } from '@kbn/logging';
import type { WorkerProcessesConfig } from '../config';
import { WorkerPoolAtCapacityError, WorkerMemoryBudgetExceededError } from './errors';
import { CgroupEnforcer } from './cgroup_enforcer';
import type { CgroupCapability } from './cgroup_enforcer';
import type { WorkerPoolRunOptions, ChildToParentMessage, ParentToChildMessage } from './types';

export type { TaskWorkerPayload, WorkerPoolRunOptions } from './types';
export { WorkerPoolAtCapacityError, WorkerMemoryBudgetExceededError } from './errors';

const MEMORY_REPORT_LOG_THROTTLE_MS = 5000;

/**
 * Runs task work in dedicated Node.js child processes, so long-running or CPU-bound task
 * work doesn't block Task Manager's own event loop - and, unlike a shared worker-thread
 * pool, so a task's declared memory budget can be a genuine, kernel-enforced guarantee
 * rather than a best-effort heap cap. See the "Child-Process Task Pool" plan for the full
 * design rationale.
 *
 * Every `run()` forks a fresh, single-use child (`task_process_wrapper.js`) sized to
 * `memoryMb + baseline_memory_mb` via `--max-old-space-size`, and - on Linux with a
 * delegated cgroups v2 subtree - places it into a dedicated cgroup with a matching hard
 * `memory.max` and a fair-share `cpu.weight` (see `CgroupEnforcer`). Memory is additionally
 * tracked as a reservation ledger against `max_total_memory_mb`: every run's
 * `memoryMb + baseline_memory_mb` is reserved for its duration and released when it settles,
 * so Task Manager can check, before claiming or dispatching a worker task, whether there is
 * room to run another task with its declared requirements.
 *
 * Enforcement without cgroups (macOS/Windows/undelegated Linux) deliberately does not kill
 * on measured RSS: RSS includes ballooned-but-collectible heap and memory V8 hasn't returned
 * to the OS, so a userspace watchdog would spuriously kill well-behaved bursty tasks. Only
 * the self-regulating V8 heap cap enforces in that mode; RSS is observed and logged, not
 * acted on. `enforcement: 'strict'` disables the pool entirely rather than degrade silently.
 */
export class WorkerPoolService {
  private readonly config: WorkerProcessesConfig;
  private readonly logger: Logger;
  private readonly cgroups: CgroupEnforcer;
  private reservedMemoryMb = 0;
  private readonly activeChildren = new Set<ChildProcess>();
  private disabledDueToStrictEnforcement = false;
  private hasLoggedEnforcementMode = false;

  constructor(config: WorkerProcessesConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.cgroups = new CgroupEnforcer(logger);
  }

  public get enabled(): boolean {
    return this.config.enabled && !this.disabledDueToStrictEnforcement;
  }

  public start(): void {
    if (!this.config.enabled) {
      return;
    }

    this.cgroups.setup();
    const capability = this.cgroups.capability;

    if (!capability.supported && this.config.enforcement === 'strict') {
      this.disabledDueToStrictEnforcement = true;
      this.logger.error(
        `Task manager worker process pool disabled: enforcement is "strict" but kernel-enforced hard memory limits are unavailable (${capability.reason}). Worker task types will be excluded from claiming.`
      );
      return;
    }

    this.logHierarchyResult(capability);
  }

  private logHierarchyResult(capability: CgroupCapability): void {
    if (this.hasLoggedEnforcementMode) {
      return;
    }
    this.hasLoggedEnforcementMode = true;
    if (capability.supported) {
      this.logger.info(
        `Task manager worker process pool started: hard memory limits enforced via cgroups v2 (maxProcesses=${this.config.max_processes} maxTotalMemoryMb=${this.config.max_total_memory_mb} baselineMemoryMb=${this.config.baseline_memory_mb}).`
      );
    } else {
      this.logger.warn(
        `Task manager worker process pool started in fallback mode: only a portable V8 heap cap is enforced, RSS budgets are observed and logged but NOT enforced (${capability.reason}). Set xpack.task_manager.unsafe.worker_processes.enforcement: 'strict' to refuse startup instead of degrading. maxProcesses=${this.config.max_processes} maxTotalMemoryMb=${this.config.max_total_memory_mb} baselineMemoryMb=${this.config.baseline_memory_mb}.`
      );
    }
  }

  /**
   * The remaining memory budget (MB) not currently reserved by in-flight runs. Each in-flight
   * run reserves its declared `memoryMb` plus `baseline_memory_mb`, so this reflects the true
   * remaining headroom, not just the declared-work portion of it.
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
    return this.enabled && memoryMb + this.config.baseline_memory_mb <= this.availableMemoryMb;
  }

  /**
   * Forks a fresh, single-use child process, runs `moduleId`'s default export with `input`
   * in it, and returns its result. Reserves `memoryMb + baseline_memory_mb` from the shared
   * budget for the duration of the run, releasing it when the run settles (success, failure,
   * or abort). Throws {@link WorkerPoolAtCapacityError} immediately, without queueing, if the
   * reservation does not fit the current budget.
   */
  public async run<TResult = unknown>(
    moduleId: string,
    input: unknown,
    { memoryMb, signal }: WorkerPoolRunOptions
  ): Promise<TResult> {
    if (!this.enabled) {
      throw new Error('Task manager worker pool is not enabled');
    }

    const totalMb = memoryMb + this.config.baseline_memory_mb;
    if (totalMb > this.availableMemoryMb) {
      throw new WorkerPoolAtCapacityError(
        memoryMb,
        Math.max(0, this.availableMemoryMb - this.config.baseline_memory_mb)
      );
    }

    this.reservedMemoryMb += totalMb;
    try {
      return await this.runInChild<TResult>(moduleId, input, totalMb, signal);
    } finally {
      this.reservedMemoryMb -= totalMb;
    }
  }

  private runInChild<TResult>(
    moduleId: string,
    input: unknown,
    memoryLimitMb: number,
    signal?: AbortSignal
  ): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const child = fork(require.resolve('./task_process_wrapper.js'), [], {
        execArgv: [`--max-old-space-size=${memoryLimitMb}`],
        serialization: 'advanced',
      });
      this.activeChildren.add(child);

      let settled = false;
      let cgroupHandle: ReturnType<CgroupEnforcer['createChildCgroup']> | undefined;
      let lastMemoryWarnAt = 0;

      const cleanup = () => {
        this.activeChildren.delete(child);
        signal?.removeEventListener('abort', onAbort);
        cgroupHandle?.cleanup();
      };

      const settleResolve = (value: TResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const settleReject = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const onAbort = () => {
        settleReject(
          Object.assign(new Error('Worker process run aborted'), { name: 'AbortError' })
        );
        child.kill('SIGKILL');
      };
      signal?.addEventListener('abort', onAbort);

      child.once('error', (err) => settleReject(err));

      let placedInCgroup = false;
      child.on('message', (rawMessage: unknown) => {
        const message = rawMessage as ChildToParentMessage;
        if (message.type === 'ready') {
          this.placeChild(child, memoryLimitMb, (handle) => {
            cgroupHandle = handle;
            placedInCgroup = !!handle;
          });
          const goMessage: ParentToChildMessage = { type: 'go', moduleId, input };
          child.send(goMessage);
          return;
        }
        if (message.type === 'result') {
          settleResolve(message.result as TResult);
          return;
        }
        if (message.type === 'error') {
          settleReject(
            Object.assign(new Error(message.error.message), { stack: message.error.stack })
          );
          return;
        }
        if (message.type === 'memoryUsage') {
          // Fallback-only observability: never kills on this, only logs. See the class-level
          // doc for why RSS-based killing is deliberately not implemented in userspace.
          if (!placedInCgroup && message.rss > memoryLimitMb * 1024 * 1024) {
            const now = Date.now();
            if (now - lastMemoryWarnAt > MEMORY_REPORT_LOG_THROTTLE_MS) {
              lastMemoryWarnAt = now;
              this.logger.warn(
                `Worker process (pid=${
                  child.pid
                }) exceeded its declared memory budget of ${memoryLimitMb}MB: measured RSS=${(
                  message.rss /
                  1024 /
                  1024
                ).toFixed(1)}MB, heapUsed=${(message.heapUsed / 1024 / 1024).toFixed(
                  1
                )}MB, external=${(message.external / 1024 / 1024).toFixed(
                  1
                )}MB. Not terminated (no kernel enforcement available) - consider raising this task's declared memoryMb.`
              );
            }
          }
        }
      });

      child.once('exit', (code, exitSignal) => {
        if (settled) return;
        const oomKillCount = cgroupHandle?.readOomKillCount() ?? 0;
        if (oomKillCount > 0) {
          settleReject(new WorkerMemoryBudgetExceededError(memoryLimitMb));
          return;
        }
        if (exitSignal === 'SIGKILL' || code === null) {
          settleReject(
            new Error(
              `Worker process (pid=${child.pid}) was killed (signal=${
                exitSignal ?? 'unknown'
              }). This may be a heap-cap OOM if no hard cgroup limit is in effect.`
            )
          );
          return;
        }
        settleReject(
          new Error(`Worker process (pid=${child.pid}) exited unexpectedly with code ${code}.`)
        );
      });
    });
  }

  /**
   * Places a ready child into its per-run cgroup (when available) or applies the portable
   * fallback protections (`oom_score_adj`, CPU niceness) otherwise. Called between the
   * child's `ready` and `go` messages so no task code runs before limits are in effect.
   */
  private placeChild(
    child: ChildProcess,
    memoryLimitMb: number,
    onCgroupHandle: (handle: ReturnType<CgroupEnforcer['createChildCgroup']> | undefined) => void
  ): void {
    if (!child.pid) {
      onCgroupHandle(undefined);
      return;
    }

    if (this.cgroups.capability.supported) {
      try {
        const handle = this.cgroups.createChildCgroup(memoryLimitMb, this.config.max_cpu_percent);
        handle.place(child.pid);
        onCgroupHandle(handle);
        return;
      } catch (err) {
        this.logger.warn(
          `Failed to place worker process (pid=${child.pid}) into a cgroup, falling back to best-effort protections for this run: ${err.message}`
        );
      }
    }

    onCgroupHandle(undefined);
    this.applyFallbackProtections(child);
  }

  /**
   * Portable damage-limitation applied when kernel enforcement is unavailable: lowers the
   * child's OS scheduling priority (so Kibana's own process is favored under CPU contention,
   * cross-platform) and, on Linux without a usable cgroup, nudges the kernel's OOM killer to
   * prefer this child over the main Kibana process if the whole container comes under
   * memory pressure. Neither mechanism kills the child itself for exceeding its budget.
   */
  private applyFallbackProtections(child: ChildProcess): void {
    if (!child.pid) {
      return;
    }
    try {
      os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch (err) {
      this.logger.debug(
        `Could not lower priority for worker process (pid=${child.pid}): ${err.message}`
      );
    }
    if (process.platform === 'linux') {
      try {
        // `@kbn/fs` is not usable here: this is a Linux `/proc` kernel pseudo-file for an
        // OS-level OOM-killer hint, not user-supplied content under Kibana's data directory.
        // eslint-disable-next-line @kbn/eslint/require_kbn_fs
        fs.writeFileSync(`/proc/${child.pid}/oom_score_adj`, '500');
      } catch (err) {
        this.logger.debug(
          `Could not set oom_score_adj for worker process (pid=${child.pid}): ${err.message}`
        );
      }
    }
  }

  public async stop(): Promise<void> {
    for (const child of this.activeChildren) {
      child.kill('SIGKILL');
    }
    this.activeChildren.clear();
  }
}
