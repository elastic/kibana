/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { setImmediate } from 'node:timers';
import { Worker } from 'node:worker_threads';
import { Subject, type Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { EventLoopWatchdogConfig } from '../config';
import { installCurrentTaskAccessor, uninstallCurrentTaskAccessor } from './current_task_context';
import { formatBlockReport } from './report';
import {
  DETECT_THRESHOLD_MS,
  HEARTBEAT_INTERVAL_MS,
  POLL_INTERVAL_MS,
  monotonicUs,
  type EventLoopBlockReport,
  type EventLoopRunObservation,
  type EventLoopRunObserver,
  type WatchdogWorkerData,
  type WorkerToMainMessage,
} from './types';

export interface EventLoopWatchdogDeps {
  logger: Logger;
  config: EventLoopWatchdogConfig;
  /** Monotonic microseconds. For tests. */
  now?: () => number;
}

/** How long a finished run waits for the worker's report on a block that overlapped it. */
const REPORT_WAIT_MS = 1000;
const LEDGER_MAX_AGE_US = 60_000_000;
const LEDGER_MAX_ENTRIES = 100;
const NO_OBSERVATION: EventLoopRunObservation = { end: () => Promise.resolve([]) };

/** A block the main thread noticed itself, waiting for the worker's report of the same block. */
interface MainBlock {
  startedAtUs: number;
  endedAtUs: number;
  report?: EventLoopBlockReport;
  waiters: Array<(report?: EventLoopBlockReport) => void>;
}

/**
 * Owns the heartbeat the worker watches, the worker's lifecycle and the current-task accessor the
 * worker samples. Everything else (detection, sampling, the flag decision) happens in the worker,
 * see `worker.ts`. Emits one report per block of at least the detection threshold on `blocks$`.
 */
export class EventLoopWatchdog implements EventLoopRunObserver {
  private readonly logger: Logger;
  private readonly config: EventLoopWatchdogConfig;
  private readonly blocksSubject = new Subject<EventLoopBlockReport>();
  private readonly now: () => number;
  private heartbeat?: BigInt64Array;
  private lastStampUs = 0;
  private readonly ledger: MainBlock[] = [];
  private heartbeatTimer?: NodeJS.Timeout;
  private worker?: Worker;
  private enabled = false;
  /** When the worker started polling; blocks before it were never seen by the worker. */
  private workerReadyAtUs?: number;
  private readyWaiters: Array<() => void> = [];

  public readonly blocks$: Observable<EventLoopBlockReport> = this.blocksSubject.asObservable();

  constructor({ logger, config, now = monotonicUs }: EventLoopWatchdogDeps) {
    this.logger = logger;
    this.now = now;
    this.config = config;
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  /** Starts the heartbeat and the worker. No-op when disabled in config. */
  public start(): void {
    if (this.enabled || !this.config.enabled) return;
    this.enabled = true;

    const shared = new SharedArrayBuffer(BigInt64Array.BYTES_PER_ELEMENT);
    this.heartbeat = new BigInt64Array(shared);
    this.lastStampUs = this.now();
    Atomics.store(this.heartbeat, 0, BigInt(this.lastStampUs));
    this.heartbeatTimer = setInterval(() => this.beat(), HEARTBEAT_INTERVAL_MS);
    // `unref` is absent when timers come from a non-node test environment.
    this.heartbeatTimer.unref?.();

    installCurrentTaskAccessor();

    const workerData: WatchdogWorkerData = {
      shared,
      flagThresholdMs: this.config.flag_threshold_ms,
      minCpuRatio: this.config.min_cpu_ratio,
      liveReportIntervalMs: this.config.live_report_interval_ms,
    };
    // `worker_entry.js` is transpiled to the same name in dist and bootstraps TypeScript from source.
    const worker = new Worker(path.resolve(__dirname, 'worker_entry.js'), {
      workerData,
      // It only holds a few samples per block: a runaway should fail it, not compete with Kibana.
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
    });
    this.worker = worker;
    worker.on('message', (message: WorkerToMainMessage) => this.onWorkerMessage(message));
    worker.on('error', (error) => {
      this.logger.error(`Event loop watchdog worker failed, disabling it: ${error.message}`);
      this.stop();
    });
    worker.on('exit', (code) => {
      // Our own `stop()` clears `this.worker` before terminating, so this is an unexpected exit.
      if (this.worker !== worker) return;
      this.logger.error(`Event loop watchdog worker exited with code ${code}, disabling it`);
      this.stop();
    });
    // A diagnostic must never keep the process alive. After the listeners: attaching a `message`
    // listener references the worker again.
    worker.unref();

    this.logger.info(
      `Enabled (flag_threshold_ms=${this.config.flag_threshold_ms}, min_cpu_ratio=${this.config.min_cpu_ratio})`
    );
  }

  public stop(): void {
    if (!this.enabled) return;
    this.enabled = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    uninstallCurrentTaskAccessor();
    this.heartbeat = undefined;
    this.workerReadyAtUs = undefined;
    this.readyWaiters = [];
    this.ledger.splice(0).forEach((block) => block.waiters.forEach((resolve) => resolve()));
    const { worker } = this;
    this.worker = undefined;
    worker?.terminate().catch(() => {});
  }

  /**
   * Stamps the heartbeat the worker watches. A stamp later than the detection threshold means the
   * main thread was blocked since the previous one: that block is noted so that a run completing
   * right after it can wait for the worker's report of it. Also called synchronously when a run
   * starts and ends, so it never depends on when the timer gets to run.
   */
  private beat(): void {
    if (!this.heartbeat) return;
    const nowUs = this.now();
    if (nowUs - this.lastStampUs >= DETECT_THRESHOLD_MS * 1000) {
      this.recordBlock(this.lastStampUs, nowUs);
    }
    this.lastStampUs = nowUs;
    Atomics.store(this.heartbeat, 0, BigInt(nowUs));
  }

  private recordBlock(startedAtUs: number, endedAtUs: number): void {
    this.ledger.push({ startedAtUs, endedAtUs, waiters: [] });
    while (
      this.ledger.length > LEDGER_MAX_ENTRIES ||
      (this.ledger.length > 0 && this.ledger[0].endedAtUs < endedAtUs - LEDGER_MAX_AGE_US)
    ) {
      this.ledger.shift()!.waiters.forEach((resolve) => resolve());
    }
  }

  /** Resolves once the worker is polling. For tests and callers that must not race its boot. */
  public whenReady(): Promise<void> {
    if (this.workerReadyAtUs !== undefined) return Promise.resolve();
    return new Promise((resolve) => this.readyWaiters.push(resolve));
  }

  private waitForReport(block: MainBlock): Promise<EventLoopBlockReport | undefined> {
    if (block.report) return Promise.resolve(block.report);
    return new Promise((resolve) => {
      // After the timeout, let the poll phase deliver a message that is already queued: when the
      // run is followed by another long block the timers phase would otherwise win.
      const timeout = setTimeout(() => setImmediate(() => resolve(block.report)), REPORT_WAIT_MS);
      timeout.unref?.();
      block.waiters.push((report) => {
        clearTimeout(timeout);
        resolve(report);
      });
    });
  }

  /**
   * Observes a task run. When the run completes, `end()` resolves the reports of the blocks that
   * overlapped it, so that the run's completion path can record that it blocked the event loop
   * before it writes its results. The watchdog keeps no per-run state: a missed `end()` leaks nothing.
   */
  public beginRun(_executionUuid: string): EventLoopRunObservation {
    if (!this.enabled) return NO_OBSERVATION;
    this.beat();
    const startedAtUs = this.lastStampUs;
    return { end: () => this.endRun(startedAtUs) };
  }

  private endRun(startedAtUs: number): Promise<EventLoopBlockReport[]> {
    if (!this.enabled) return Promise.resolve([]);
    this.beat();
    const endedAtUs = this.lastStampUs;
    // Blocks that cannot flag (too short), that the worker cannot see (barely above its detection
    // threshold) or that ended before the worker was polling are not waited for.
    const readyAtUs = this.workerReadyAtUs ?? Infinity;
    const minUs =
      Math.max(this.config.flag_threshold_ms, DETECT_THRESHOLD_MS + POLL_INTERVAL_MS) * 1000;
    const candidates = this.ledger.filter(
      (block) =>
        block.endedAtUs > startedAtUs &&
        block.endedAtUs > readyAtUs &&
        block.startedAtUs < endedAtUs &&
        block.endedAtUs - block.startedAtUs >= minUs
    );
    // The common case, no block during the run, does no async work.
    if (candidates.length === 0) return Promise.resolve([]);
    return Promise.all(candidates.map((block) => this.waitForReport(block))).then((reports) => [
      // One report can cover several main-side blocks.
      ...new Set(reports.filter((report): report is EventLoopBlockReport => report !== undefined)),
    ]);
  }

  private onWorkerMessage(message: WorkerToMainMessage): void {
    if (message.type === 'ready') {
      this.workerReadyAtUs = this.now();
      this.readyWaiters.splice(0).forEach((resolve) => resolve());
      return;
    }
    if (message.type === 'worker-error') {
      this.logger.warn(`Event loop watchdog worker error: ${message.message}`);
      return;
    }
    const { report } = message;
    const text = formatBlockReport(report);
    if (report.flag.flagged) {
      const { taskId, taskType } = report.flag;
      // The evidence is in the message. No structured fields: on Cloud, log fields are indexed and
      // a `kibana.event_loop_watchdog` object clashes with mappings left by other watchdog work.
      this.logger.warn(text, { tags: ['event-loop-watchdog', taskType, taskId] });
    } else if (report.reportable) {
      this.logger.info(text);
    } else {
      this.logger.debug(text);
    }
    // A starved worker can merge back-to-back blocks: match by containment, not equality.
    for (const block of this.ledger) {
      if (
        !block.report &&
        report.startedAtUs <= block.startedAtUs &&
        block.endedAtUs <= report.endedAtUs
      ) {
        block.report = report;
        block.waiters.splice(0).forEach((resolve) => resolve(report));
      }
    }
    this.blocksSubject.next(report);
  }
}
