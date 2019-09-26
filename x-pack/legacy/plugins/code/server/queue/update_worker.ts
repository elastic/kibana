/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CloneWorkerResult, Repository, WorkerReservedProgress } from '../../model';
import { EsClient, Esqueue } from '../lib/esqueue';
import { DiskWatermarkService } from '../disk_watermark';
import { GitOperations } from '../git_operations';
import { Logger } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { AbstractGitWorker } from './abstract_git_worker';
import { CancellationReason, CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class UpdateWorker extends AbstractGitWorker {
  public id: string = 'update';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    protected readonly gitOps: GitOperations,
    protected readonly repoServiceFactory: RepositoryServiceFactory,
    private readonly cancellationService: CancellationSerivce,
    protected readonly watermarkService: DiskWatermarkService
  ) {
    super(queue, log, client, serverOptions, gitOps, watermarkService);
  }

  public async executeJob(job: Job) {
    const superRes = await super.executeJob(job);
    if (superRes.cancelled) {
      return superRes;
    }

    const { payload, cancellationToken } = job;
    const repo: Repository = payload;
    this.log.info(`Execute update job for ${repo.uri}`);
    const repoService = this.repoServiceFactory.newInstance(
      this.serverOptions.repoPath,
      this.serverOptions.credsPath,
      this.log,
      this.serverOptions.security.enableGitCertCheck
    );

    // Try to cancel any existing update job for this repository.
    await this.cancellationService.cancelUpdateJob(repo.uri, CancellationReason.NEW_JOB_OVERRIDEN);

    let cancelled = false;
    let cancelledReason;
    if (cancellationToken) {
      cancellationToken.on((reason: string) => {
        cancelled = true;
        cancelledReason = reason;
      });
    }

    const updateJobPromise = repoService.update(repo, async () => {
      if (cancelled) {
        // return false to stop the update progress
        return false;
      }

      // Keep an eye on the disk usage during update in case it goes above the
      // disk watermark config.
      if (await this.watermarkService.isLowWatermark()) {
        // Cancel this update job
        if (cancellationToken) {
          cancellationToken.cancel(CancellationReason.LOW_DISK_SPACE);
        }
        // return false to stop the update progress
        return false;
      }

      return true;
    });

    if (cancellationToken) {
      await this.cancellationService.registerCancelableUpdateJob(
        repo.uri,
        cancellationToken,
        updateJobPromise
      );
    }
    const res = await updateJobPromise;
    return {
      ...res,
      cancelled,
      cancelledReason,
    };
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    if (res.cancelled) {
      await this.onJobCancelled(job, res.cancelledReason);
      // Skip updating job progress if the job is done because of cancellation.
      return;
    }

    this.log.info(`Update job done for ${job.payload.uri}`);
    return await super.onJobCompleted(job, res);
  }

  public async onJobExecutionError(res: any) {
    return await this.overrideUpdateErrorProgress(res);
  }

  public async onJobTimeOut(res: any) {
    return await this.overrideUpdateErrorProgress(res);
  }

  private async overrideUpdateErrorProgress(res: any) {
    this.log.warn(`Update job error`);
    this.log.warn(res.error);
    // Do not persist update errors assuming the next update trial is scheduling soon.
    return await this.updateProgress(res.job, WorkerReservedProgress.COMPLETED);
  }
}
