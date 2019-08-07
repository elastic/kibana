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
import { CancellationSerivce } from './cancellation_service';
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
    await super.executeJob(job);

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
    this.cancellationService.cancelUpdateJob(repo.uri);

    let cancelled = false;
    if (cancellationToken) {
      cancellationToken.on(() => {
        cancelled = true;
      });
    }

    const updateJobPromise = repoService.update(repo, () => {
      if (cancelled) {
        // return false to stop the clone progress
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

    return await updateJobPromise;
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
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
