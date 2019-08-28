/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PLUGIN_ID } from '../../common/constants';
import {
  ESQueueInstance,
  ESQueueWorkerExecuteFn,
  ExportType,
  JobDoc,
  JobSource,
  KbnServer,
} from '../../types';
// @ts-ignore untyped dependency
import { events as esqueueEvents } from './esqueue';
import { LevelLogger } from './level_logger';
import { oncePerServer } from './once_per_server';

function createWorkerFn(server: KbnServer) {
  const config = server.config();
  const queueConfig = config.get('xpack.reporting.queue');
  const kibanaName = config.get('server.name');
  const kibanaId = config.get('server.uuid');
  const exportTypesRegistry = server.plugins.reporting.exportTypesRegistry;
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'queue-worker']);

  // Once more document types are added, this will need to be passed in
  return function createWorker(queue: ESQueueInstance) {
    // export type / execute job map
    const jobExectors: Map<string, ESQueueWorkerExecuteFn> = new Map();

    for (const exportType of exportTypesRegistry.getAll() as ExportType[]) {
      const executeJob = exportType.executeJobFactory(server);
      jobExectors.set(exportType.jobType, executeJob);
    }

    const workerFn = (job: JobSource, jobdoc: JobDoc, cancellationToken: any) => {
      // pass the work to the jobExecutor
      const jobExecutor = jobExectors.get(job._source.jobtype);
      if (!jobExecutor) {
        throw new Error(`Unable to find a job executor for the claimed job: [${job._id}]`);
      }
      return jobExecutor(job._id, jobdoc, cancellationToken);
    };
    const workerOptions = {
      kibanaName,
      kibanaId,
      interval: queueConfig.pollInterval,
      intervalErrorMultiplier: queueConfig.pollIntervalErrorMultiplier,
    };
    const worker = queue.registerWorker(PLUGIN_ID, workerFn, workerOptions);

    worker.on(esqueueEvents.EVENT_WORKER_COMPLETE, (res: any) => {
      logger.debug(`Worker completed: (${res.job.id})`);
    });
    worker.on(esqueueEvents.EVENT_WORKER_JOB_EXECUTION_ERROR, (res: any) => {
      logger.debug(`Worker error: (${res.job.id})`);
    });
    worker.on(esqueueEvents.EVENT_WORKER_JOB_TIMEOUT, (res: any) => {
      logger.debug(`Job timeout exceeded: (${res.job.id})`);
    });
  };
}

export const createWorkerFactory = oncePerServer(createWorkerFn);
