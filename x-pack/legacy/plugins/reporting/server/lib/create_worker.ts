/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PLUGIN_ID } from '../../common/constants';
import {
  ESQueueInstance,
  QueueConfig,
  ExportTypeDefinition,
  ESQueueWorkerExecuteFn,
  ImmediateExecuteFn,
  JobDoc,
  JobDocPayload,
  JobSource,
  ServerFacade,
} from '../../types';
// @ts-ignore untyped dependency
import { events as esqueueEvents } from './esqueue';
import { LevelLogger } from './level_logger';
import { oncePerServer } from './once_per_server';

function createWorkerFn(server: ServerFacade) {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'queue-worker']);
  const queueConfig: QueueConfig = config.get('xpack.reporting.queue');
  const kibanaName: string = config.get('server.name');
  const kibanaId: string = config.get('server.uuid');
  const { exportTypesRegistry } = server.plugins.reporting!;

  // Once more document types are added, this will need to be passed in
  return function createWorker(queue: ESQueueInstance) {
    // export type / execute job map
    const jobExecutors: Map<string, ESQueueWorkerExecuteFn | ImmediateExecuteFn> = new Map();

    for (const exportType of exportTypesRegistry.getAll() as ExportTypeDefinition[]) {
      const executeJobFactory = exportType.executeJobFactory(server);
      jobExecutors.set(exportType.jobType, executeJobFactory);
    }

    const workerFn = (job: JobSource, jobdoc: JobDocPayload | JobDoc, cancellationToken?: any) => {
      // pass the work to the jobExecutor
      if (!jobExecutors.get(job._source.jobtype)) {
        throw new Error(`Unable to find a job executor for the claimed job: [${job._id}]`);
      }
      if (job._id) {
        const jobExecutor = jobExecutors.get(job._source.jobtype) as ESQueueWorkerExecuteFn;
        return jobExecutor(job._id, jobdoc as JobDoc, cancellationToken);
      } else {
        const jobExecutor = jobExecutors.get(job._source.jobtype) as ImmediateExecuteFn;
        return jobExecutor(null, jobdoc as JobDocPayload, cancellationToken);
      }
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
