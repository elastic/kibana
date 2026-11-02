/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * Worker-thread bootstrap for the TaskCoordinator. Receives plain-data
 * CoordinatorWorkerData, constructs the coordinator's sanctioned dependency
 * set locally:
 *   - esClient:   a fresh @elastic/elasticsearch Client (the main thread's
 *                 client instance cannot cross postMessage). Connection info
 *                 comes from TM_POC_ES_* env vars for the PoC; a production
 *                 version needs core to mint worker-safe client config.
 *   - serializer: a real SavedObjectsSerializer over a minimal type registry
 *                 ('task' is namespace-agnostic, which is all the claim path
 *                 reads).
 *   - logger:     writes to the worker's stdout (relayed to the parent
 *                 process's stream by Node) AND synchronously to an optional
 *                 side log file, so claim-cycle evidence survives a blocked
 *                 main-thread event loop.
 * and bridges the three channels over parentPort messages.
 */

import { parentPort, workerData, threadId } from 'worker_threads';
import { appendFileSync } from 'fs';
import { Subject } from 'rxjs';
import { Client } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';

import { TaskCoordinator } from '../task_coordinator';
import type {
  CapacitySnapshot,
  CoordinatorLogger,
  CoordinatorToExecutorMessage,
  CoordinatorWorkerData,
  ExecutionReport,
  ExecutorToCoordinatorMessage,
} from '../types';

if (!parentPort) {
  throw new Error('coordinator_worker must be run inside a worker thread');
}
const port = parentPort;
const data = workerData as CoordinatorWorkerData;

const post = (message: CoordinatorToExecutorMessage) => port.postMessage(message);

/* ------------------------------- logger ------------------------------- */

const createLogger = (): CoordinatorLogger => {
  const write = (level: string, message: string) => {
    const line = `[${new Date().toISOString()}][${level}][task-coordinator-worker:${threadId}] ${message}`;
    // stdout write goes through the parent process's stream relay; the sync
    // file write below is the main-thread-block-proof evidence channel.
    // eslint-disable-next-line no-console
    console.log(line);
    if (data.logFilePath) {
      try {
        appendFileSync(data.logFilePath, `${line}\n`);
      } catch {
        // best effort
      }
    }
  };
  return {
    trace: (message: string) => write('TRACE', message),
    debug: (message: string) => write('DEBUG', message),
    info: (message: string) => write('INFO', message),
    warn: (message: string) => write('WARN', message),
    error: (message: string | Error) => write('ERROR', `${message}`),
  };
};

const logger = createLogger();

/* ------------------------------ serializer ------------------------------ */

const createSerializer = () => {
  const registry = new SavedObjectTypeRegistry();
  // The claim path only needs the serializer to recognise raw 'task' docs and
  // split the raw _id ('task:<uuid>'); both types TM stores in its own index
  // are namespace-agnostic.
  for (const name of ['task', 'background-task-node']) {
    registry.registerType({
      name,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: { properties: {} },
    });
  }
  return new SavedObjectsSerializer(registry);
};

/* ------------------------------- es client ------------------------------- */

const createEsClient = (): ElasticsearchClient => {
  const { node, username, password, apiKey } = data.es;
  const client = new Client({
    node,
    ...(apiKey
      ? { auth: { apiKey } }
      : username && password
      ? { auth: { username, password } }
      : {}),
  });
  // ElasticsearchClient is Client minus a few internals; structurally compatible.
  return client as unknown as ElasticsearchClient;
};

/* -------------------------------- channels -------------------------------- */

const capacity$ = new Subject<CapacitySnapshot>();
const executionReport$ = new Subject<ExecutionReport>();

const coordinator = new TaskCoordinator({
  esClient: createEsClient(),
  logger,
  config: data.config,
  serializer: createSerializer(),
  context: data.context,
  capacity$,
  executionReport$,
});

coordinator.claimedBatches$.subscribe((batch) => {
  post({ kind: 'claimed-batch', batch });
});
coordinator.claimErrors$.subscribe((error) => {
  post({ kind: 'claim-cycle-failed', error: error.message });
});

port.on('message', (message: ExecutorToCoordinatorMessage) => {
  switch (message.kind) {
    case 'capacity':
      capacity$.next(message.snapshot);
      break;
    case 'execution-report':
      executionReport$.next(message.report);
      break;
    case 'start':
      coordinator
        .start()
        .then(() => post({ kind: 'started' }))
        .catch((error) => post({ kind: 'fatal', error: `${error.message}\n${error.stack}` }));
      break;
    case 'shutdown':
      logger.info('Coordinator worker shutting down');
      coordinator.stop();
      // Give in-flight logging a tick, then let the thread exit.
      setTimeout(() => process.exit(0), 100).unref();
      break;
  }
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception in coordinator worker: ${error.stack}`);
  post({ kind: 'fatal', error: `${error.message}` });
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection in coordinator worker: ${reason}`);
});

logger.info(
  `Coordinator worker booted (threadId=${threadId}, pid=${process.pid}); waiting for start`
);
