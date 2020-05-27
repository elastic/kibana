/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { ESQueueCreateJobFn } from '../../server/types';
import { ReportingCore, ReportingInternalSetup } from '../core';
// @ts-ignore
import { events as esqueueEvents } from './esqueue';

interface ConfirmedJob {
  id: string;
  index: string;
  _seq_no: number;
  _primary_term: number;
}

export type Job = EventEmitter & {
  id: string;
  toJSON: () => {
    id: string;
  };
};

export type EnqueueJobFn = <JobParamsType>(
  exportTypeId: string,
  jobParams: JobParamsType,
  username: string,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<Job>;

export function enqueueJobFactory(
  reporting: ReportingCore,
  deps: ReportingInternalSetup
): EnqueueJobFn {
  const config = reporting.getConfig();
  const queueTimeout = config.get('queue', 'timeout');
  const browserType = config.get('capture', 'browser', 'type');
  const maxAttempts = config.get('capture', 'maxAttempts');
  const logger = deps.logger.clone(['queue-job']);

  return async function enqueueJob<JobParamsType>(
    exportTypeId: string,
    jobParams: JobParamsType,
    username: string,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<Job> {
    type CreateJobFn = ESQueueCreateJobFn<JobParamsType>;

    const esqueue = await reporting.getEsqueue();
    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const createJob = exportType.createJobFactory(reporting, deps) as CreateJobFn;
    const payload = await createJob(jobParams, context, request);

    const options = {
      timeout: queueTimeout,
      created_by: username,
      browser_type: browserType,
      max_attempts: maxAttempts,
    };

    return new Promise((resolve, reject) => {
      const job = esqueue.addJob(exportType.jobType, payload, options);

      job.on(esqueueEvents.EVENT_JOB_CREATED, (createdJob: ConfirmedJob) => {
        if (createdJob.id === job.id) {
          logger.info(`Successfully queued job: ${createdJob.id}`);
          resolve(job);
        }
      });
      job.on(esqueueEvents.EVENT_JOB_CREATE_ERROR, reject);
    });
  };
}
