/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { Logger } from '@kbn/core/server';
import type { EventLoopWatchdogConfig } from '../config';
import { formatReport } from './report';
import type {
  EventLoopWatchdogOpts,
  MainToWorkerMessage,
  WorkerData,
  WorkerToMainMessage,
} from './types';

export interface EventLoopWatchdogDeps {
  logger: Logger;
  config: EventLoopWatchdogConfig;
  /** Whether this build is running as a compiled dist (affects the worker module path). */
  dist: boolean;
}

/**
 * Detects blocks of the main event loop by comparing wall-clock time against a heartbeat
 * stamped from the main thread, entirely from a separate worker thread. See
 * `worker.ts` for the detection and profiling logic; this class only owns the heartbeat,
 * the worker's lifecycle, and turning its messages into log lines.
 */
export class EventLoopWatchdog {
  private readonly logger: Logger;
  private readonly config: EventLoopWatchdogConfig;
  private readonly workerModulePath: string;

  private heartbeatBuffer?: SharedArrayBuffer;
  private heartbeatView?: BigInt64Array;
  private heartbeatTimer?: NodeJS.Timeout;
  private worker?: Worker;
  private enabled = false;

  constructor({ logger, config, dist }: EventLoopWatchdogDeps) {
    this.logger = logger.get('event-loop-watchdog');
    this.config = config;
    // running in dist: `worker.ts` becomes `worker.js`; running from source, the harness
    // bootstraps ts-node so the worker thread can load the TS file directly.
    this.workerModulePath = path.resolve(
      __dirname,
      dist ? './worker.js' : './worker_src_harness.js'
    );
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  /** Starts the heartbeat and the watchdog worker. No-op when disabled in config. */
  public start(): void {
    if (this.enabled || !this.config.enabled) return;
    this.enabled = true;

    this.heartbeatBuffer = new SharedArrayBuffer(8);
    this.heartbeatView = new BigInt64Array(this.heartbeatBuffer);
    Atomics.store(this.heartbeatView, 0, BigInt(Date.now()));

    this.heartbeatTimer = setInterval(() => {
      Atomics.store(this.heartbeatView!, 0, BigInt(Date.now()));
    }, this.config.heartbeat_interval_ms);
    this.heartbeatTimer.unref?.();

    const opts: EventLoopWatchdogOpts = {
      thresholdMs: this.config.threshold_ms,
      heartbeatIntervalMs: this.config.heartbeat_interval_ms,
      pollIntervalMs: Math.max(20, Math.floor(this.config.heartbeat_interval_ms / 2)),
      liveReportIntervalMs: this.config.live_report_interval_ms,
      dedupWindowMs: this.config.dedup_window_ms,
    };
    const workerData: WorkerData = { sharedHeartbeatBuffer: this.heartbeatBuffer, opts };

    this.worker = new Worker(this.workerModulePath, { workerData });
    // Never let the watchdog keep the process alive; it's a diagnostic, not a workload.
    this.worker.unref();

    this.worker.on('message', (message: WorkerToMainMessage) => this.onWorkerMessage(message));
    this.worker.on('error', (error) => {
      this.logger.error(`Watchdog worker error, disabling: ${error.message}`);
      this.stop();
    });

    this.logger.info(
      `Enabled (threshold_ms=${this.config.threshold_ms}, heartbeat_interval_ms=${this.config.heartbeat_interval_ms}).`
    );
  }

  /** Stops the heartbeat and terminates the worker. */
  public stop(): void {
    if (!this.enabled) return;
    this.enabled = false;

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;

    if (this.worker) {
      this.worker.terminate().catch(() => {});
      this.worker = undefined;
    }
  }

  /** Announces a task run to the worker's in-flight registry. Safe to call unconditionally. */
  public notifyTaskRunStart(taskId: string, taskType: string): void {
    this.postToWorker({ type: 'run-start', taskId, taskType, startedAt: Date.now() });
  }

  /** Removes a task run from the worker's in-flight registry. Safe to call unconditionally. */
  public notifyTaskRunEnd(taskId: string): void {
    this.postToWorker({ type: 'run-end', taskId });
  }

  private postToWorker(message: MainToWorkerMessage): void {
    if (!this.enabled || !this.worker) return;
    this.worker.postMessage(message);
  }

  private onWorkerMessage(message: WorkerToMainMessage): void {
    if (message.type === 'report') {
      this.logger.warn(formatReport(message.report));
    } else if (message.type === 'worker-error') {
      // Logged at `warn`, not `debug`: a failure here (e.g. the inspector session or CPU
      // profiler erroring) silently defeats the watchdog's entire purpose, so it must be
      // visible without opting into debug logging first.
      this.logger.warn(`Watchdog worker error: ${message.message}`);
    }
  }
}
