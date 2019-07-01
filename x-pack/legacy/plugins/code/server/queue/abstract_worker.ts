/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { WorkerReservedProgress, WorkerResult } from '../../model';
import {
  CancellationToken,
  Esqueue,
  events as esqueueEvents,
  Job as JobInternal,
} from '../lib/esqueue';
import { Logger } from '../log';
import { Job } from './job';
import { Worker } from './worker';

export abstract class AbstractWorker implements Worker {
  // The id of the worker. Also serves as the id of the job this worker consumes.
  protected id = '';

  constructor(protected readonly queue: Esqueue, protected readonly log: Logger) {}

  // Assemble jobs, for now most of the job object construction should be the same.
  public async createJob(payload: any, options: any): Promise<Job> {
    const timestamp = moment().valueOf();
    if (options.timeout !== undefined && options.timeout !== null) {
      // If the job explicitly specify the timeout, then honor it.
      return {
        payload,
        options,
        timestamp,
      };
    } else {
      // Otherwise, use a default timeout.
      const timeout = await this.getTimeoutMs(payload);
      return {
        payload,
        options: {
          ...options,
          timeout,
        },
        timestamp,
      };
    }
  }

  public async executeJob(job: Job): Promise<WorkerResult> {
    // This is an abstract class. Do nothing here. You should override this.
    return new Promise<WorkerResult>((resolve, _) => {
      resolve();
    });
  }

  // Enqueue the job.
  public async enqueueJob(payload: any, options: any) {
    const job: Job = await this.createJob(payload, options);
    return new Promise((resolve, reject) => {
      const jobInternal: JobInternal<Job> = this.queue.addJob(this.id, job, job.options);
      jobInternal.on(esqueueEvents.EVENT_JOB_CREATED, async (createdJob: JobInternal<Job>) => {
        if (createdJob.id === jobInternal.id) {
          await this.onJobEnqueued(job);
          resolve(jobInternal);
        }
      });
      jobInternal.on(esqueueEvents.EVENT_JOB_CREATE_ERROR, reject);
    });
  }

  public bind() {
    const workerFn = (payload: any, cancellationToken: CancellationToken) => {
      const job: Job = {
        ...payload,
        cancellationToken,
      };
      return this.executeJob(job);
    };

    const workerOptions = {
      interval: 5000,
      capacity: 5,
      intervalErrorMultiplier: 1,
    };

    const queueWorker = this.queue.registerWorker(this.id, workerFn as any, workerOptions);

    queueWorker.on(esqueueEvents.EVENT_WORKER_COMPLETE, async (res: any) => {
      const result: WorkerResult = res.output.content;
      const job: Job = res.job;
      await this.onJobCompleted(job, result);
    });
    queueWorker.on(esqueueEvents.EVENT_WORKER_JOB_EXECUTION_ERROR, async (res: any) => {
      await this.onJobExecutionError(res);
    });
    queueWorker.on(esqueueEvents.EVENT_WORKER_JOB_TIMEOUT, async (res: any) => {
      await this.onJobTimeOut(res);
    });

    return this;
  }

  public async onJobEnqueued(job: Job) {
    this.log.info(`${this.id} job enqueued with details ${JSON.stringify(job)}`);
    return await this.updateProgress(job, WorkerReservedProgress.INIT);
  }

  public async onJobCompleted(job: Job, res: WorkerResult) {
    this.log.info(
      `${this.id} job completed with result ${JSON.stringify(
        res
      )} in ${this.workerTaskDurationSeconds(job)} seconds.`
    );
    if (res.cancelled) {
      // Skip updating job progress if the job is done because of cancellation.
      return;
    }
    return await this.updateProgress(job, WorkerReservedProgress.COMPLETED);
  }

  public async onJobExecutionError(res: any) {
    this.log.error(
      `${this.id} job execution error ${JSON.stringify(res)} in ${this.workerTaskDurationSeconds(
        res.job
      )} seconds.`
    );
    return await this.updateProgress(res.job, WorkerReservedProgress.ERROR, res.error);
  }

  public async onJobTimeOut(res: any) {
    this.log.error(
      `${this.id} job timed out ${JSON.stringify(res)} in ${this.workerTaskDurationSeconds(
        res.job
      )} seconds.`
    );
    return await this.updateProgress(res.job, WorkerReservedProgress.TIMEOUT, res.error);
  }

  public async updateProgress(job: Job, progress: number, error?: Error) {
    // This is an abstract class. Do nothing here. You should override this.
    return new Promise<WorkerResult>((resolve, _) => {
      resolve();
    });
  }

  protected async getTimeoutMs(payload: any) {
    // Set to 1 hour by default. Override this function for sub classes if necessary.
    return moment.duration(1, 'hour').asMilliseconds();
  }

  private workerTaskDurationSeconds(job: Job) {
    const diff = moment().diff(moment(job.timestamp));
    return moment.duration(diff).asSeconds();
  }
}
