/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CloneProgress,
  CloneWorkerProgress,
  CloneWorkerResult,
  WorkerReservedProgress,
  WorkerResult,
} from '../../model';
import { DiskWatermarkService } from '../disk_watermark';
import { GitOperations } from '../git_operations';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { AbstractWorker } from './abstract_worker';
import { CancellationReason } from './cancellation_service';
import { Job } from './job';

export abstract class AbstractGitWorker extends AbstractWorker {
  public id: string = 'abstract-git';
  protected objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    protected readonly gitOps: GitOperations,
    protected readonly watermarkService: DiskWatermarkService
  ) {
    super(queue, log);
    this.objectClient = new RepositoryObjectClient(client);
  }

  public async executeJob(job: Job): Promise<WorkerResult> {
    const uri = job.payload.uri;
    if (await this.watermarkService.isLowWatermark()) {
      // Return job result as cancelled.
      return {
        uri,
        cancelled: true,
        cancelledReason: CancellationReason.LOW_DISK_SPACE,
      };
    }

    return { uri };
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    await super.onJobCompleted(job, res);

    // Update the default branch.
    const repoUri = res.uri;
    const revision = await this.gitOps.getHeadRevision(repoUri);
    const defaultBranch = await this.gitOps.getDefaultBranch(repoUri);

    // Update the repository data.
    try {
      await this.objectClient.updateRepository(repoUri, {
        defaultBranch,
        revision,
      });
    } catch (error) {
      this.log.error(`Update repository default branch and revision error.`);
      this.log.error(error);
    }

    // Update the git operation status.
    try {
      return await this.objectClient.updateRepositoryGitStatus(repoUri, {
        revision,
        progress: WorkerReservedProgress.COMPLETED,
        cloneProgress: {
          isCloned: true,
        },
      });
    } catch (error) {
      this.log.error(`Update revision of repo clone done error.`);
      this.log.error(error);
    }
  }

  public async updateProgress(
    job: Job,
    progress: number,
    error?: Error,
    cloneProgress?: CloneProgress
  ) {
    const { uri } = job.payload;
    const p: CloneWorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
      cloneProgress,
      errorMessage: error ? error.message : undefined,
    };
    try {
      return await this.objectClient.updateRepositoryGitStatus(uri, p);
    } catch (err) {
      // Do nothing here since it's not blocking anything.
      // this.log.warn(`Update git clone progress error.`);
      // this.log.warn(err);
    }
  }

  protected async onJobCancelled(job: Job, reason?: CancellationReason) {
    if (reason && reason === CancellationReason.LOW_DISK_SPACE) {
      // If the clone/update job is cancelled because of the disk watermark, manually
      // trigger onJobExecutionError.
      const msg = this.watermarkService.diskWatermarkViolationMessage();
      this.log.error(
        'Git clone/update job completed because of low disk space. Move forward as error.'
      );
      const error = new Error(msg);
      await this.onJobExecutionError({ job, error });
    }
  }
}
