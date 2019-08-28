/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import {
  IndexProgress,
  IndexRequest,
  IndexStats,
  IndexerType,
  IndexWorkerProgress,
  IndexWorkerResult,
  RepositoryUri,
  WorkerProgress,
  WorkerReservedProgress,
} from '../../model';
import { GitOperations, HEAD } from '../git_operations';
import { IndexerFactory } from '../indexer';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import { aggregateIndexStats } from '../utils/index_stats_aggregator';
import { AbstractWorker } from './abstract_worker';
import { CancellationReason, CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class IndexWorker extends AbstractWorker {
  public id: string = 'index';
  private objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly indexerFactories: Map<IndexerType, IndexerFactory>,
    protected readonly gitOps: GitOperations,
    private readonly cancellationService: CancellationSerivce
  ) {
    super(queue, log);

    this.objectClient = new RepositoryObjectClient(this.client);
  }

  public async executeJob(job: Job) {
    const { payload, cancellationToken } = job;
    const { uri, revision, enforceReindex } = payload;
    const indexerNumber = this.indexerFactories.size;

    const { resume, checkpointReqs } = await this.shouldJobResume(payload);
    if (!resume) {
      this.log.info(`Index job skipped for ${uri} at revision ${revision}`);
      return {
        uri,
        revision,
      };
    }

    // Binding the index cancellation logic
    let cancelled = false;
    await this.cancellationService.cancelIndexJob(uri, CancellationReason.NEW_JOB_OVERRIDEN);
    const indexPromises: Array<Promise<IndexStats>> = Array.from(
      this.indexerFactories.values()
    ).map(async (factory: IndexerFactory) => {
      const indexer = await factory.create(uri, revision, enforceReindex);
      if (!indexer) {
        this.log.info(`Failed to create indexer for ${uri}`);
        return new Map(); // return an empty map as stats.
      }

      if (cancellationToken) {
        cancellationToken.on(() => {
          indexer.cancel();
          cancelled = true;
        });
      }

      const progressReporter = this.getProgressReporter(uri, revision, indexer.type, indexerNumber);
      return indexer.start(progressReporter, checkpointReqs.get(indexer.type));
    });

    const allPromise = Promise.all(indexPromises);

    if (cancellationToken) {
      await this.cancellationService.registerCancelableIndexJob(uri, cancellationToken, allPromise);
    }

    const stats: IndexStats[] = await allPromise;
    const res: IndexWorkerResult = {
      uri,
      revision,
      stats: aggregateIndexStats(stats),
      cancelled,
    };
    return res;
  }

  public async onJobEnqueued(job: Job) {
    const { uri, revision } = job.payload;
    const progress: WorkerProgress = {
      uri,
      progress: WorkerReservedProgress.INIT,
      timestamp: new Date(),
      revision,
    };
    return await this.objectClient.setRepositoryIndexStatus(uri, progress);
  }

  public async onJobCompleted(job: Job, res: IndexWorkerResult) {
    if (res.cancelled) {
      // Skip updating job progress if the job is done because of cancellation.
      return;
    }

    this.log.info(`Index worker finished with stats: ${JSON.stringify([...res.stats])}`);
    await super.onJobCompleted(job, res);
    const { uri, revision } = job.payload;
    try {
      // Double check if the current revision is different from the origin reivsion.
      // If so, kick off another index job to catch up the data descrepency.
      const gitStatus = await this.objectClient.getRepositoryGitStatus(uri);
      if (gitStatus.revision !== revision) {
        const payload = {
          uri,
          revision: gitStatus.revision,
        };
        await this.enqueueJob(payload, {});
      }

      return await this.objectClient.updateRepository(uri, { indexedRevision: revision });
    } catch (error) {
      this.log.error(`Update indexed revision in repository object error.`);
      this.log.error(error);
    }
  }

  public async updateProgress(job: Job, progress: number) {
    const { uri } = job.payload;
    let p: any = {
      uri,
      progress,
      timestamp: new Date(),
    };
    if (
      progress === WorkerReservedProgress.COMPLETED ||
      progress === WorkerReservedProgress.ERROR ||
      progress === WorkerReservedProgress.TIMEOUT
    ) {
      // Reset the checkpoints if necessary.
      p = {
        ...p,
        indexProgress: {
          checkpoint: null,
        },
        commitIndexProgress: {
          checkpoint: null,
        },
      };
    }
    try {
      return await this.objectClient.updateRepositoryIndexStatus(uri, p);
    } catch (error) {
      this.log.error(`Update index progress error.`);
      this.log.error(error);
    }
  }

  protected async getTimeoutMs(payload: any) {
    try {
      const totalCount = await this.gitOps.countRepoFiles(payload.uri, HEAD);
      let timeout = moment.duration(1, 'hour').asMilliseconds();
      if (totalCount > 0) {
        // timeout = ln(file_count) in hour
        // e.g. 10 files -> 2.3 hours, 100 files -> 4.6 hours, 1000 -> 6.9 hours, 10000 -> 9.2 hours
        timeout = moment.duration(Math.log(totalCount), 'hour').asMilliseconds();
      }
      this.log.info(`Set index job timeout to be ${timeout} ms.`);
      return timeout;
    } catch (error) {
      this.log.error(`Get repo file total count error.`);
      this.log.error(error);
      throw error;
    }
  }

  private getProgressReporter(
    repoUri: RepositoryUri,
    revision: string,
    type: IndexerType,
    total: number // total number of indexers
  ) {
    return async (progress: IndexProgress) => {
      const indexStatus: IndexWorkerProgress = await this.objectClient.getRepositoryIndexStatus(
        repoUri
      );
      const p: IndexWorkerProgress = {
        uri: repoUri,
        progress: indexStatus.progress,
        timestamp: new Date(),
        revision,
      };

      switch (type) {
        case IndexerType.COMMIT:
          p.commitIndexProgress = progress;
          p.progress =
            progress.percentage +
            (indexStatus.indexProgress ? indexStatus.indexProgress.percentage : 0);
          break;
        case IndexerType.LSP:
          p.indexProgress = progress;
          p.progress =
            progress.percentage +
            (indexStatus.commitIndexProgress ? indexStatus.commitIndexProgress.percentage : 0);
          break;
        default:
          this.log.warn(`Unknown indexer type ${type} for indexing progress report.`);
          break;
      }
      return await this.objectClient.updateRepositoryIndexStatus(repoUri, p);
    };
  }

  // 1. Try to load checkpointed requests for all indexers to the `checkpointReqs` field
  // of the return value.
  // 2. Make a decision on if the index job should proceed indicate by the boolean `resume`
  // field of the return value.
  private async shouldJobResume(
    payload: any
  ): Promise<{
    resume: boolean;
    checkpointReqs: Map<IndexerType, IndexRequest | undefined>;
  }> {
    const { uri, revision } = payload;

    const workerProgress = (await this.objectClient.getRepositoryIndexStatus(
      uri
    )) as IndexWorkerProgress;

    let lspCheckpointReq: IndexRequest | undefined;
    let commitCheckpointReq: IndexRequest | undefined;
    const checkpointReqs: Map<IndexerType, IndexRequest | undefined> = new Map();
    if (workerProgress) {
      // There exist an ongoing index process
      const {
        uri: currentUri,
        revision: currentRevision,
        indexProgress: currentLspIndexProgress,
        commitIndexProgress: currentCommitIndexProgress,
        progress,
      } = workerProgress;

      lspCheckpointReq = currentLspIndexProgress && currentLspIndexProgress.checkpoint;
      commitCheckpointReq = currentCommitIndexProgress && currentCommitIndexProgress.checkpoint;

      if (
        !lspCheckpointReq &&
        !commitCheckpointReq &&
        progress > WorkerReservedProgress.INIT &&
        progress < WorkerReservedProgress.COMPLETED &&
        currentUri === uri &&
        currentRevision === revision
      ) {
        // Dedup this index job request if:
        // 1. no checkpoint exist (undefined or empty string) for either LSP or commit indexer
        // 2. index progress is ongoing
        // 3. the uri and revision match the current job
        return {
          resume: false,
          checkpointReqs,
        };
      }
    }

    // Add the checkpoints into the map as a result to return. They could be undefined.
    checkpointReqs.set(IndexerType.LSP, lspCheckpointReq);
    checkpointReqs.set(IndexerType.LSP_INC, lspCheckpointReq);
    checkpointReqs.set(IndexerType.COMMIT, commitCheckpointReq);
    checkpointReqs.set(IndexerType.COMMIT_INC, commitCheckpointReq);

    return {
      resume: true,
      checkpointReqs,
    };
  }
}
