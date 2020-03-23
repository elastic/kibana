/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import {
  ConditionalHeaders,
  EnqueueJobFn,
  ESQueueCreateJobFn,
  ImmediateCreateJobFn,
  Job,
  Logger,
  RequestFacade,
} from '../../types';
import { ReportingCore } from '../core';
// @ts-ignore
import { events as esqueueEvents } from './esqueue';

interface ConfirmedJob {
  id: string;
  index: string;
  _seq_no: number;
  _primary_term: number;
}

export async function enqueueJobFactory(
  reporting: ReportingCore,
  parentLogger: Logger
): Promise<EnqueueJobFn> {
  const config = await reporting.getConfig();
  const logger = parentLogger.clone(['queue-job']);
  const captureConfig = config.get('capture');
  const browserType = captureConfig.browser.type;
  const maxAttempts = captureConfig.maxAttempts;
  const queueConfig = config.get('queue');

  return async function enqueueJob<JobParamsType>(
    exportTypeId: string,
    jobParams: JobParamsType,
    user: string,
    headers: ConditionalHeaders['headers'],
    request: RequestFacade
  ): Promise<Job> {
    type CreateJobFn = ESQueueCreateJobFn<JobParamsType> | ImmediateCreateJobFn<JobParamsType>;

    const esqueue = await reporting.getEsqueue();
    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    // TODO: the createJobFn should be unwrapped in the register method of the export types registry
    const createJob = (await exportType.createJobFactory(reporting, logger)) as CreateJobFn;
    const payload = await createJob(jobParams, headers, request);

    const options = {
      timeout: queueConfig.timeout,
      created_by: get(user, 'username', false),
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
