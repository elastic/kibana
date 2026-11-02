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
import { Worker } from 'worker_threads';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from './config';
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

/** PoC gate: default behaviour is untouched unless this env var is set. */
export function isPocWorkerCoordinatorEnabled(): boolean {
  return process.env[POC_WORKER_COORDINATOR_ENV_FLAG] === 'true';
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
}

export class WorkerCoordinatorBridge {
  public readonly claimedBatches$: Observable<ClaimedTaskBatch>;

  private readonly claimedBatchesSubject = new Subject<ClaimedTaskBatch>();
  private readonly logger: Logger;
  private readonly opts: WorkerCoordinatorBridgeOpts;
  private worker?: Worker;
  private snapshotTimer?: NodeJS.Timeout;
  private stopped = false;

  constructor(opts: WorkerCoordinatorBridgeOpts) {
    this.opts = opts;
    this.logger = opts.logger.get('pocWorkerCoordinatorBridge');
    this.claimedBatches$ = this.claimedBatchesSubject.asObservable();
  }

  public start() {
    const { config, context } = this.opts;

    const workerData: CoordinatorWorkerData = {
      config,
      context,
      es: {
        node: process.env.TM_POC_ES_NODE ?? 'http://localhost:9200',
        // kibana_system: the only stock user with allow_restricted_indices on
        // the Kibana system indices (superuser cannot write them).
        username: process.env.TM_POC_ES_USER ?? 'kibana_system',
        password: process.env.TM_POC_ES_PASS ?? 'changeme',
        apiKey: process.env.TM_POC_ES_API_KEY,
      },
      logFilePath: process.env.TM_POC_WORKER_LOG_FILE,
    };

    this.logger.info(
      `Starting PoC coordinator worker thread (es node: ${workerData.es.node}, log file: ${
        workerData.logFilePath ?? 'none'
      })`
    );

    this.worker = new Worker(Path.resolve(__dirname, 'poc_coordinator/worker/coordinator_worker_entry.js'), {
      workerData,
    });

    this.worker.on('message', (message: CoordinatorToExecutorMessage) => {
      switch (message.kind) {
        case 'started':
          this.logger.info('PoC coordinator worker reported started');
          break;
        case 'claimed-batch':
          this.claimedBatchesSubject.next(message.batch);
          break;
        case 'claim-cycle-failed':
          this.logger.error(`PoC coordinator worker claim cycle failed: ${message.error}`);
          break;
        case 'fatal':
          this.logger.error(`PoC coordinator worker fatal error: ${message.error}`);
          break;
      }
    });
    this.worker.on('error', (error) => {
      this.logger.error(`PoC coordinator worker error: ${error.message}`);
    });
    this.worker.on('exit', (code) => {
      if (!this.stopped) {
        this.logger.error(
          `PoC coordinator worker exited unexpectedly with code ${code}; no claiming will happen on this node`
        );
      }
    });

    this.send({ kind: 'start' });

    // Channels 1 and 3 on a fixed cadence. When the main thread is blocked,
    // these stop flowing and the coordinator continues on stale data — that is
    // the point (advisory capacity, over-claim tolerated).
    this.snapshotTimer = setInterval(() => {
      this.send({ kind: 'capacity', snapshot: this.opts.getCapacitySnapshot() });
      this.send({ kind: 'execution-report', report: this.opts.getExecutionReport() });
    }, SNAPSHOT_INTERVAL_MS);
    this.snapshotTimer.unref();
  }

  public async stop() {
    this.stopped = true;
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
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
