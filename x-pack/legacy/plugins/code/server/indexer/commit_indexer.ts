/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProgressReporter } from '.';
import {
  Commit,
  CommitIndexRequest,
  IndexStats,
  IndexStatsKey,
  IndexerType,
  RepositoryUri,
} from '../../model';
import { GitOperations, HEAD } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { AbstractIndexer } from './abstract_indexer';
import { BatchIndexHelper } from './batch_index_helper';
import { getCommitIndexCreationRequest } from './index_creation_request';
import { CommitIndexName } from './schema';

// TODO: implement an incremental commit indexer.
export class CommitIndexer extends AbstractIndexer {
  public type: IndexerType = IndexerType.COMMIT;
  // Batch index helper for commits
  protected commitBatchIndexHelper: BatchIndexHelper;

  private COMMIT_BATCH_INDEX_SIZE = 1000;

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly gitOps: GitOperations,
    protected readonly client: EsClient,
    protected log: Logger
  ) {
    super(repoUri, revision, client, log);
    this.commitBatchIndexHelper = new BatchIndexHelper(client, log, this.COMMIT_BATCH_INDEX_SIZE);
  }

  public async start(progressReporter?: ProgressReporter, checkpointReq?: CommitIndexRequest) {
    try {
      return await super.start(progressReporter, checkpointReq);
    } finally {
      if (!this.isCancelled()) {
        // Flush all the index request still in the cache for bulk index.
        this.commitBatchIndexHelper.flush();
      }
    }
  }

  public cancel() {
    this.commitBatchIndexHelper.cancel();
    super.cancel();
  }

  // If the current checkpoint is valid
  protected validateCheckpoint(checkpointReq?: CommitIndexRequest): boolean {
    // Up to change when integrate with the actual git api.
    return checkpointReq !== undefined && checkpointReq.revision === this.revision;
  }

  // If it's necessary to refresh (create and reset) all the related indices
  protected needRefreshIndices(checkpointReq?: CommitIndexRequest): boolean {
    // If it's not resumed from a checkpoint, then try to refresh all the indices.
    return !this.validateCheckpoint(checkpointReq);
  }

  protected ifCheckpointMet(req: CommitIndexRequest, checkpointReq: CommitIndexRequest): boolean {
    // Assume for the same revision, the order of the files we iterate the repository is definite
    // everytime. This is up to change when integrate with the actual git api.
    return req.commit.id === checkpointReq.commit.id;
  }

  protected async prepareIndexCreationRequests() {
    return [getCommitIndexCreationRequest(this.repoUri)];
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<CommitIndexRequest> {
    if (!this.commits) {
      return;
    }
    try {
      for await (const commit of this.commits) {
        const req: CommitIndexRequest = {
          repoUri: this.repoUri,
          revision: this.revision,
          commit,
        };
        yield req;
      }
    } catch (error) {
      this.log.error(`Prepare commit indexing requests error.`);
      this.log.error(error);
      throw error;
    }
  }

  private commits: Commit[] | null = null;
  protected async getIndexRequestCount(): Promise<number> {
    try {
      this.commits = await this.gitOps.iterateCommits(this.repoUri, HEAD);
      return this.commits.length;
    } catch (error) {
      if (this.isCancelled()) {
        this.log.debug(`Indexer ${this.type} got cancelled. Skip get index count error.`);
        return 1;
      } else {
        this.log.error(`Get lsp index requests count error.`);
        this.log.error(error);
        throw error;
      }
    }
  }

  protected async cleanIndex() {
    // Clean up all the commits in the commit index
    try {
      await this.client.deleteByQuery({
        index: CommitIndexName(this.repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up commits for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up commits for ${this.repoUri} error.`);
      this.log.error(error);
    }
  }

  protected async processRequest(request: CommitIndexRequest): Promise<IndexStats> {
    const stats: IndexStats = new Map<IndexStatsKey, number>().set(IndexStatsKey.Commit, 0);
    const { repoUri, commit } = request;

    await this.commitBatchIndexHelper.index(CommitIndexName(repoUri), commit);
    stats.set(IndexStatsKey.Commit, 1);
    return stats;
  }
}
