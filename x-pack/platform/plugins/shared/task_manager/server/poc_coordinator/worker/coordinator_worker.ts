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
 *   - logger:     ECS-shaped JSON written synchronously to fd 1 with
 *                 fs.writeSync, bypassing the worker->parent stdout relay so
 *                 claim-cycle evidence reaches container stdout even while
 *                 the main-thread event loop is blocked.
 * and bridges the three channels over parentPort messages.
 */

import { parentPort, workerData, threadId } from 'worker_threads';
import { readFileSync, writeSync } from 'fs';
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
  // Secrets must never reach a log line; scrub them even from ES error bodies.
  const secrets = [data.es.serviceAccountToken, data.es.password].filter(
    (secret): secret is string => typeof secret === 'string' && secret.length > 0
  );
  const redact = (message: string) => {
    let out = message;
    for (const secret of secrets) out = out.split(secret).join('[REDACTED]');
    return out;
  };
  const write = (level: string, message: string) => {
    // ECS-shaped JSON, written straight to fd 1 with fs.writeSync: this
    // bypasses the worker->parent stdout relay, so claim-cycle evidence
    // reaches container stdout even while the main thread event loop is
    // blocked (the cloud smoke's only evidence channel).
    const line = `${JSON.stringify({
      '@timestamp': new Date().toISOString(),
      'log.level': level,
      'log.logger': `task-coordinator-worker:${threadId}`,
      message: redact(message),
    })}\n`;
    try {
      writeSync(1, line);
    } catch {
      // best effort
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
  const { node, username, password, serviceAccountToken, caPaths, rejectUnauthorized } = data.es;
  const ca = (caPaths ?? [])
    .map((path) => {
      try {
        return readFileSync(path, 'utf8');
      } catch (error) {
        logger.warn(`Could not read ES certificate authority at ${path}: ${error.message}`);
        return undefined;
      }
    })
    .filter((pem): pem is string => pem !== undefined);

  const client = new Client({
    node,
    // Finding: .kibana_task_manager is a restricted system index. Even the
    // elastic superuser cannot write it (superuser grants
    // allow_restricted_indices: false); the coordinator must authenticate as
    // kibana_system / the kibana service account (allow_restricted_indices).
    // The product-origin header suppresses system-index deprecation warnings.
    headers: { 'x-elastic-product-origin': 'kibana' },
    ...(serviceAccountToken
      ? { auth: { bearer: serviceAccountToken } }
      : username && password
      ? { auth: { username, password } }
      : {}),
    ...(ca.length > 0 || rejectUnauthorized === false
      ? {
          tls: {
            ...(ca.length > 0 ? { ca } : {}),
            rejectUnauthorized: rejectUnauthorized !== false ? true : false,
          },
        }
      : {}),
  });
  // ElasticsearchClient is Client minus a few internals; structurally compatible.
  return client as unknown as ElasticsearchClient;
};

/* -------------------------------- channels -------------------------------- */

const capacity$ = new Subject<CapacitySnapshot>();
const executionReport$ = new Subject<ExecutionReport>();

// Hardened: a construction failure must surface as a 'fatal' message (which
// makes the executor fall back to in-process polling), never as a silent or
// crashing worker.
const createCoordinator = (): TaskCoordinator => {
  if (process.env.TM_POC_SIMULATE_FAILURE === 'worker-boot') {
    throw new Error('simulated worker boot failure (TM_POC_SIMULATE_FAILURE=worker-boot)');
  }
  return new TaskCoordinator({
    esClient: createEsClient(),
    logger,
    config: data.config,
    serializer: createSerializer(),
    context: data.context,
    capacity$,
    executionReport$,
  });
};

let coordinator: TaskCoordinator;
try {
  coordinator = createCoordinator();
} catch (error) {
  logger.error(`Coordinator worker failed to construct: ${error.message}`);
  post({ kind: 'fatal', error: `${error.message}` });
  // Give the message a tick to flush, then exit; the bridge falls back.
  setTimeout(() => process.exit(1), 100);
  throw error;
}

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
