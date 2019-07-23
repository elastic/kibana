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

export class CancellationSerivce {
  private cloneCancellationMap: Map<RepositoryUri, CancellableJob>;
  private updateCancellationMap: Map<RepositoryUri, CancellableJob>;
  private indexCancellationMap: Map<RepositoryUri, CancellableJob>;

  constructor() {
    this.cloneCancellationMap = new Map<RepositoryUri, CancellableJob>();
    this.updateCancellationMap = new Map<RepositoryUri, CancellableJob>();
    this.indexCancellationMap = new Map<RepositoryUri, CancellableJob>();
  }

  public async cancelCloneJob(repoUri: RepositoryUri) {
    await this.cancelJob(this.cloneCancellationMap, repoUri);
  }

  public async cancelUpdateJob(repoUri: RepositoryUri) {
    await this.cancelJob(this.updateCancellationMap, repoUri);
  }

  public async cancelIndexJob(repoUri: RepositoryUri) {
    await this.cancelJob(this.indexCancellationMap, repoUri);
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
    await this.cancelJob(jobMap, repoUri);
    jobMap.set(repoUri, { token, jobPromise });
  }

  private async cancelJob(jobMap: Map<RepositoryUri, CancellableJob>, repoUri: RepositoryUri) {
    const payload = jobMap.get(repoUri);
    if (payload) {
      const { token, jobPromise } = payload;
      // 1. Use the cancellation token to pass cancel message to job
      token.cancel();
      // 2. waiting on the actual job promise to be resolved
      await jobPromise;
      // 3. remove the record from the cancellation service
      jobMap.delete(repoUri);
    }
  }
}
