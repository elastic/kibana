/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Repository } from '../../../model';

/**
 * A snapshot of the cluster meta data, which includes:
 * - repository objects
 */
export class ClusterMetadata {
  private readonly uri2Repo: Map<string, Repository>;

  constructor(public readonly repositories: Repository[] = []) {
    this.uri2Repo = repositories.reduce((prev, cur) => {
      prev.set(cur.uri, cur);
      return prev;
    }, new Map<string, Repository>());
  }

  public getRepository(uri: string): Repository | undefined {
    return this.uri2Repo.get(uri);
  }
}
