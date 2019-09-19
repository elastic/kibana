/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Indexer, IndexerFactory, CommitIndexer } from '.';
import { RepositoryUri } from '../../model';
import { GitOperations } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';

export class CommitIndexerFactory implements IndexerFactory {
  constructor(
    protected readonly gitOps: GitOperations,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {}

  public async create(
    repoUri: RepositoryUri,
    revision: string,
    // Apply this param when the incremental indexer has been built.
    enforcedReindex: boolean = false
  ): Promise<Indexer | undefined> {
    this.log.info(`Create indexer to index ${repoUri} commits`);
    // Create the indexer to index the entire repository.
    return new CommitIndexer(repoUri, revision, this.gitOps, this.client, this.log);
  }
}
