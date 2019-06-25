/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProgressReporter } from '.';
import { Commit, CommitIndexRequest, IndexStats, IndexStatsKey, RepositoryUri } from '../../model';
import { GitOperations, HEAD } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { AbstractIndexer } from './abstract_indexer';
import { BatchIndexHelper } from './batch_index_helper';
import { getCommitIndexCreationRequest } from './index_creation_request';
import { ALL_RESERVED, CommitIndexName } from './schema';

export class CommitIndexer extends AbstractIndexer {
  protected type: string = 'commit';

  // Batch index helper for commits
  protected commitBatchIndexHelper: BatchIndexHelper;

  private COMMIT_BATCH_INDEX_SIZE = 1000;

  constructor(
    protected readonly repoUri: RepositoryUri,
    // For workspace handling.
    protected readonly lspService: LspService,
    protected readonly gitOps: GitOperations,
    protected readonly client: EsClient,
    protected log: Logger
  ) {
    super(repoUri, 'HEAD', client, log);
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

  // If the current checkpoint is valid
  protected validateCheckpoint(checkpointReq?: CommitIndexRequest): boolean {
    return false; // update this
  }

  // If it's necessary to refresh (create and reset) all the related indices
  protected needRefreshIndices(checkpointReq?: CommitIndexRequest): boolean {
    // If it's not resumed from a checkpoint, then try to refresh all the indices.
    return !this.validateCheckpoint(checkpointReq);
  }

  protected ifCheckpointMet(req: CommitIndexRequest, checkpointReq: CommitIndexRequest): boolean {
    // Assume for the same revision, the order of the files we iterate the repository is definite
    // everytime.
    return true; // update this
  }

  protected async prepareIndexCreationRequests() {
    return [getCommitIndexCreationRequest(this.repoUri)];
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<CommitIndexRequest> {
    let repo;
    try {
      const { workspaceRepo } = await this.lspService.workspaceHandler.openWorkspace(
        this.repoUri,
        HEAD
      );
      repo = workspaceRepo;
      const commitIterator = await this.gitOps.iterateCommits(this.repoUri, HEAD);
      for await (const commit of commitIterator) {
        const req: CommitIndexRequest = {
          repoUri: this.repoUri,
          revision: commit.id,
        };
        yield req;
      }
    } catch (error) {
      this.log.error(`Prepare commit indexing requests error.`);
      this.log.error(error);
      throw error;
    } finally {
      if (repo) {
        repo.cleanup();
      }
    }
  }

  protected async getIndexRequestCount(): Promise<number> {
    try {
      // return await this.gitOps.countRepoFiles(this.repoUri, HEAD);
      return 1;
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
    // Clean up all the commits documents in the commit index
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
    const { repoUri, revision } = request;

    const body: Commit = {
      repoUri,
      id: revision,
    };
    await this.commitBatchIndexHelper.index(CommitIndexName(repoUri), body);
    stats.set(IndexStatsKey.Commit, 1);
    return stats;
  }
}
