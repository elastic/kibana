/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from '../../model';
import { CancellationToken } from '../lib/esqueue';

interface CancellableJob {
  token: CancellationToken;
  jobPromise: Promise<any>;
}

export enum CancellationReason {
  REPOSITORY_DELETE = 'Cancel job because of deleting the entire repository',
  LOW_DISK_SPACE = 'Cancel job because of low available disk space',
  NEW_JOB_OVERRIDEN = 'Cancel job because of a new job of the same type has been registered',
}

export class CancellationSerivce {
  private cloneCancellationMap: Map<RepositoryUri, CancellableJob>;
  private updateCancellationMap: Map<RepositoryUri, CancellableJob>;
  private indexCancellationMap: Map<RepositoryUri, CancellableJob>;

  constructor() {
    this.cloneCancellationMap = new Map<RepositoryUri, CancellableJob>();
    this.updateCancellationMap = new Map<RepositoryUri, CancellableJob>();
    this.indexCancellationMap = new Map<RepositoryUri, CancellableJob>();
  }

  public async cancelCloneJob(repoUri: RepositoryUri, reason: CancellationReason) {
    await this.cancelJob(this.cloneCancellationMap, repoUri, reason);
  }

  public async cancelUpdateJob(repoUri: RepositoryUri, reason: CancellationReason) {
    await this.cancelJob(this.updateCancellationMap, repoUri, reason);
  }

  public async cancelIndexJob(repoUri: RepositoryUri, reason: CancellationReason) {
    await this.cancelJob(this.indexCancellationMap, repoUri, reason);
  }

  public async registerCancelableCloneJob(
    repoUri: RepositoryUri,
    token: CancellationToken,
    jobPromise: Promise<any>
  ) {
    await this.registerCancelableJob(this.cloneCancellationMap, repoUri, token, jobPromise);
  }

  public async registerCancelableUpdateJob(
    repoUri: RepositoryUri,
    token: CancellationToken,
    jobPromise: Promise<any>
  ) {
    await this.registerCancelableJob(this.updateCancellationMap, repoUri, token, jobPromise);
  }

  public async registerCancelableIndexJob(
    repoUri: RepositoryUri,
    token: CancellationToken,
    jobPromise: Promise<any>
  ) {
    await this.registerCancelableJob(this.indexCancellationMap, repoUri, token, jobPromise);
  }

  private async registerCancelableJob(
    jobMap: Map<RepositoryUri, CancellableJob>,
    repoUri: RepositoryUri,
    token: CancellationToken,
    jobPromise: Promise<any>
  ) {
    // Try to cancel the job first.
    await this.cancelJob(jobMap, repoUri, CancellationReason.NEW_JOB_OVERRIDEN);
    jobMap.set(repoUri, { token, jobPromise });
    // remove the record from the cancellation service when the promise is fulfilled or rejected.
    jobPromise.finally(() => {
      jobMap.delete(repoUri);
    });
  }

  private async cancelJob(
    jobMap: Map<RepositoryUri, CancellableJob>,
    repoUri: RepositoryUri,
    reason: CancellationReason
  ) {
    const payload = jobMap.get(repoUri);
    if (payload) {
      const { token, jobPromise } = payload;
      // 1. Use the cancellation token to pass cancel message to job
      token.cancel(reason);
      // 2. waiting on the actual job promise to be resolved
      try {
        await jobPromise;
      } catch (e) {
        // the exception from the job also indicates the job is finished, and it should be the duty of the worker for
        // the job to handle it, so it's safe to just ignore the exception here
      }
    }
  }
}
