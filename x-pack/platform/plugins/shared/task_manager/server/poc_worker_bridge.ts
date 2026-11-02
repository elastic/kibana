/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam — EXECUTOR side of the worker transport.
 *
 * Lives OUTSIDE poc_coordinator/ on purpose: this file may import execution
 * machinery (it is the executor half), while poc_coordinator/ is covered by
 * the dependency gate.
 *
 * Spawns the coordinator worker thread and maps the three channels onto
 * postMessage:
 *   channel 1 (capacity$):        pushed on a fixed cadence from the pool
 *   channel 2 (claimed batches):  received from the worker
 *   channel 3 (execution report): pushed on the same cadence
 */

import Path from 'path';
import { existsSync } from 'fs';
import { Worker } from 'worker_threads';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from './config';
import { resolvePocEsConnection, describePocEsConnection } from './poc_es_config';
import type { TaskTypeDictionary } from './task_type_dictionary';
import type {
  CapacitySnapshot,
  ClaimedTaskBatch,
  CoordinatorContext,
  CoordinatorToExecutorMessage,
  CoordinatorWorkerData,
  ExecutionReport,
  ExecutorToCoordinatorMessage,
  SerializedTaskTypeDefinition,
} from './poc_coordinator/types';

export const POC_WORKER_COORDINATOR_ENV_FLAG = 'TM_POC_WORKER_COORDINATOR';

/**
 * PoC gate. QAF serverless deployments cannot inject env vars or config, so
 * on SERVERLESS builds of this branch the worker coordinator is ON by default
 * (this branch never merges); TM_POC_WORKER_COORDINATOR=false is the kill
 * switch. On traditional builds (dev, jest, stateful dist) the default stays
 * OFF and TM_POC_WORKER_COORDINATOR=true opts in.
 */
export function isPocWorkerCoordinatorEnabled(isServerless: boolean): boolean {
  const flag = process.env[POC_WORKER_COORDINATOR_ENV_FLAG];
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return isServerless;
}

/** Capacity/report push cadence. Deliberately simple for the PoC. */
const SNAPSHOT_INTERVAL_MS = 500;

/** Behaviour never crosses the seam: serialize claim-relevant metadata only. */
export function serializeTaskDefinitions(
  definitions: TaskTypeDictionary
): SerializedTaskTypeDefinition[] {
  return definitions.getAllDefinitions().map((def) => ({
    type: def.type,
    cost: def.cost ?? 2,
    priority: def.priority,
    maxConcurrency: def.maxConcurrency,
    maxAttempts: def.maxAttempts,
    timeout: def.timeout,
  }));
}

export interface WorkerCoordinatorBridgeOpts {
  logger: Logger;
  config: TaskManagerConfig;
  context: CoordinatorContext;
  getCapacitySnapshot: () => CapacitySnapshot;
  getExecutionReport: () => ExecutionReport;
  /**
   * Invoked at most once when the worker coordinator is deemed unusable
   * (spawn failure, worker fatal/exit, startup timeout, or persistent claim
   * failures). The executor side must fall back to stock in-process polling
   * so the PoC can never degrade Task Manager below default behaviour.
   */
  onFailure: (reason: string) => void;
}

/** No 'started' within this window counts as a failed worker boot. */
const STARTUP_TIMEOUT_MS = 30_000;
/** Consecutive failed claim cycles before the worker is deemed unusable. */
const MAX_CONSECUTIVE_CLAIM_FAILURES = 5;

export class WorkerCoordinatorBridge {
  public readonly claimedBatches$: Observable<ClaimedTaskBatch>;

  private readonly claimedBatchesSubject = new Subject<ClaimedTaskBatch>();
  private readonly logger: Logger;
  private readonly opts: WorkerCoordinatorBridgeOpts;
  private worker?: Worker;
  private snapshotTimer?: NodeJS.Timeout;
  private startupTimer?: NodeJS.Timeout;
  private stopped = false;
  private failed = false;
  private consecutiveClaimFailures = 0;

  constructor(opts: WorkerCoordinatorBridgeOpts) {
    this.opts = opts;
    this.logger = opts.logger.get('pocWorkerCoordinatorBridge');
    this.claimedBatches$ = this.claimedBatchesSubject.asObservable();
  }

  /**
   * Spawns the coordinator worker. Never throws: any synchronous failure is
   * reported through onFailure so the caller can fall back to the in-process
   * poller.
   */
  public start() {
    try {
      this.doStart();
    } catch (error) {
      this.fail(`failed to start the coordinator worker: ${error.message}`);
    }
  }

  private doStart() {
    const { config, context } = this.opts;

    if (process.env.TM_POC_SIMULATE_FAILURE === 'bridge-start') {
      throw new Error('simulated bridge start failure (TM_POC_SIMULATE_FAILURE=bridge-start)');
    }

    // Re-derive the ES connection from env/argv/config files (core does not
    // expose its resolved credentials to plugins). Secrets never logged.
    const connection = resolvePocEsConnection();
    this.logger.info(
      `PoC coordinator worker ES connection: ${describePocEsConnection(connection)}`
    );

    const workerData: CoordinatorWorkerData = {
      config,
      context,
      es: {
        node: connection.node,
        username: connection.username,
        password: connection.password,
        serviceAccountToken: connection.serviceAccountToken,
        caPaths: connection.caPaths,
        rejectUnauthorized: connection.rejectUnauthorized,
      },
    };

    // Dist builds ship the compiled worker next to the dev entry; point the
    // Worker straight at it (pdfmaker pattern). In source/dev the compiled
    // file does not exist and the entry installs the TS transpiler first.
    const compiledWorker = Path.resolve(__dirname, 'poc_coordinator/worker/coordinator_worker.js');
    const workerPath = existsSync(compiledWorker)
      ? compiledWorker
      : Path.resolve(__dirname, 'poc_coordinator/worker/coordinator_worker_entry.js');

    this.logger.info(
      `Starting PoC coordinator worker thread (${
        workerPath === compiledWorker ? 'dist' : 'dev'
      } mode)`
    );

    this.worker = new Worker(workerPath, {
      workerData,
    });

    this.worker.on('message', (message: CoordinatorToExecutorMessage) => {
      switch (message.kind) {
        case 'started':
          this.logger.info('PoC coordinator worker reported started');
          if (this.startupTimer) {
            clearTimeout(this.startupTimer);
            this.startupTimer = undefined;
          }
          break;
        case 'claimed-batch':
          this.consecutiveClaimFailures = 0;
          this.claimedBatchesSubject.next(message.batch);
          break;
        case 'claim-cycle-failed':
          this.consecutiveClaimFailures++;
          this.logger.error(
            `PoC coordinator worker claim cycle failed (${this.consecutiveClaimFailures} in a row): ${message.error}`
          );
          if (this.consecutiveClaimFailures >= MAX_CONSECUTIVE_CLAIM_FAILURES) {
            this.fail(
              `${this.consecutiveClaimFailures} consecutive claim cycle failures (e.g. unusable ES connection)`
            );
          }
          break;
        case 'fatal':
          this.fail(`worker reported a fatal error: ${message.error}`);
          break;
      }
    });
    this.worker.on('error', (error) => {
      this.fail(`worker thread error: ${error.message}`);
    });
    this.worker.on('exit', (code) => {
      if (!this.stopped) {
        this.fail(`worker exited unexpectedly with code ${code}`);
      }
    });

    this.send({ kind: 'start' });

    // A worker that never reports started (hung boot) also counts as failed.
    this.startupTimer = setTimeout(() => {
      this.fail(`worker did not report started within ${STARTUP_TIMEOUT_MS}ms`);
    }, STARTUP_TIMEOUT_MS);
    this.startupTimer.unref();

    // Channels 1 and 3 on a fixed cadence. When the main thread is blocked,
    // these stop flowing and the coordinator continues on stale data — that is
    // the point (advisory capacity, over-claim tolerated).
    this.snapshotTimer = setInterval(() => {
      try {
        this.send({ kind: 'capacity', snapshot: this.opts.getCapacitySnapshot() });
        this.send({ kind: 'execution-report', report: this.opts.getExecutionReport() });
      } catch (error) {
        // Never let a snapshot failure escape a timer callback; the
        // coordinator just keeps using its last snapshot.
        this.logger.error(`Failed to push a capacity snapshot to the worker: ${error.message}`);
      }
    }, SNAPSHOT_INTERVAL_MS);
    this.snapshotTimer.unref();
  }

  /** Report failure once and hand control back to the executor side. */
  private fail(reason: string) {
    if (this.failed || this.stopped) return;
    this.failed = true;
    this.logger.error(`PoC worker coordinator is unusable: ${reason}`);
    void this.stop();
    try {
      this.opts.onFailure(reason);
    } catch (error) {
      this.logger.error(`PoC worker coordinator onFailure handler threw: ${error.message}`);
    }
  }

  public async stop() {
    this.stopped = true;
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.send({ kind: 'shutdown' });
    if (this.worker) {
      const worker = this.worker;
      // Give the worker a moment to shut down cleanly, then terminate.
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          void worker.terminate().then(() => resolve());
        }, 2000);
        worker.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  }

  private send(message: ExecutorToCoordinatorMessage) {
    try {
      this.worker?.postMessage(message);
    } catch (error) {
      this.logger.error(`Failed to post message to PoC coordinator worker: ${error.message}`);
    }
  }
}
