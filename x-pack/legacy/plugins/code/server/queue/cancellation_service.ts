/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from '../../model';
import { CancellationToken } from '../lib/esqueue';

export class CancellationSerivce {
  private cloneCancellationMap: Map<RepositoryUri, CancellationToken>;
  private updateCancellationMap: Map<RepositoryUri, CancellationToken>;
  private indexCancellationMap: Map<RepositoryUri, CancellationToken>;

  constructor() {
    this.cloneCancellationMap = new Map<RepositoryUri, CancellationToken>();
    this.updateCancellationMap = new Map<RepositoryUri, CancellationToken>();
    this.indexCancellationMap = new Map<RepositoryUri, CancellationToken>();
  }

  public cancelCloneJob(repoUri: RepositoryUri) {
    const token = this.cloneCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
      this.cloneCancellationMap.delete(repoUri);
    }
  }

  public cancelUpdateJob(repoUri: RepositoryUri) {
    const token = this.updateCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
      this.updateCancellationMap.delete(repoUri);
    }
  }

  public cancelIndexJob(repoUri: RepositoryUri) {
    const token = this.indexCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
      this.indexCancellationMap.delete(repoUri);
    }
  }

  public registerCloneJobToken(repoUri: RepositoryUri, cancellationToken: CancellationToken) {
    const token = this.cloneCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
    }
    this.cloneCancellationMap.set(repoUri, cancellationToken);
  }

  public registerUpdateJobToken(repoUri: RepositoryUri, cancellationToken: CancellationToken) {
    const token = this.updateCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
    }
    this.updateCancellationMap.set(repoUri, cancellationToken);
  }

  public registerIndexJobToken(repoUri: RepositoryUri, cancellationToken: CancellationToken) {
    const token = this.indexCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
    }
    this.indexCancellationMap.set(repoUri, cancellationToken);
  }
}
