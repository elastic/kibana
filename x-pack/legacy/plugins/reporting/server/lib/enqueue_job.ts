/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
// @ts-ignore
import { events as esqueueEvents } from './esqueue';
import {
  ESQueueCreateJobFn,
  ImmediateCreateJobFn,
  Job,
  ServerFacade,
  RequestFacade,
  Logger,
  CaptureConfig,
  QueueConfig,
  ConditionalHeaders,
} from '../../types';

interface ConfirmedJob {
  id: string;
  index: string;
  _seq_no: number;
  _primary_term: number;
}

export function enqueueJobFactory(server: ServerFacade) {
  const config = server.config();
  const captureConfig: CaptureConfig = config.get('xpack.reporting.capture');
  const browserType = captureConfig.browser.type;
  const maxAttempts = captureConfig.maxAttempts;
  const queueConfig: QueueConfig = config.get('xpack.reporting.queue');
  const { exportTypesRegistry, queue: jobQueue } = server.plugins.reporting!;

  return async function enqueueJob<JobParamsType>(
    parentLogger: Logger,
    exportTypeId: string,
    jobParams: JobParamsType,
    user: string,
    headers: ConditionalHeaders['headers'],
    request: RequestFacade
  ): Promise<Job> {
    type CreateJobFn = ESQueueCreateJobFn<JobParamsType> | ImmediateCreateJobFn<JobParamsType>;

    const logger = parentLogger.clone(['queue-job']);
    const exportType = exportTypesRegistry.getById(exportTypeId);
    const createJob = exportType.createJobFactory(server) as CreateJobFn;
    const payload = await createJob(jobParams, headers, request);

    const options = {
      timeout: queueConfig.timeout,
      created_by: get(user, 'username', false),
      browser_type: browserType,
      max_attempts: maxAttempts,
    };

    return new Promise((resolve, reject) => {
      const job = jobQueue.addJob(exportType.jobType, payload, options);

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
