/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { RepositoryUri, WorkerReservedProgress } from '../../model';
import { WorkerProgress } from '../../model/repository';
import { GitOperations } from '../git_operations';
import { DocumentIndexName, ReferenceIndexName, SymbolIndexName } from '../indexer/schema';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { AbstractWorker } from './abstract_worker';
import { CancellationReason, CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class DeleteWorker extends AbstractWorker {
  public id: string = 'delete';
  private objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    protected readonly gitOps: GitOperations,
    private readonly cancellationService: CancellationSerivce,
    private readonly lspService: LspService,
    private readonly repoServiceFactory: RepositoryServiceFactory
  ) {
    super(queue, log);
    this.objectClient = new RepositoryObjectClient(this.client);
  }

  public async executeJob(job: Job) {
    const { uri } = job.payload;

    try {
      // 1. Cancel running clone and update workers
      await this.cancellationService.cancelCloneJob(uri, CancellationReason.REPOSITORY_DELETE);
      await this.cancellationService.cancelUpdateJob(uri, CancellationReason.REPOSITORY_DELETE);

      // 2. Delete workspace and index workers. Since the indexing could be
      // hanging in the initialization stage, we should delete the workspace
      // to cancel it in the meantime.
      const deleteWorkspacePromise = this.deletePromiseWrapper(
        this.lspService.deleteWorkspace(uri),
        'workspace',
        uri
      );
      const indexJobCancelPromise = this.cancellationService.cancelIndexJob(
        uri,
        CancellationReason.REPOSITORY_DELETE
      );
      await Promise.all([deleteWorkspacePromise, indexJobCancelPromise]);

      // 3. Delete ES indices and aliases
      const deleteSymbolESIndexPromise = this.deletePromiseWrapper(
        this.client.indices.delete({ index: `${SymbolIndexName(uri)}*` }),
        'symbol ES index',
        uri
      );

      const deleteReferenceESIndexPromise = this.deletePromiseWrapper(
        this.client.indices.delete({ index: `${ReferenceIndexName(uri)}*` }),
        'reference ES index',
        uri
      );
      await Promise.all([deleteSymbolESIndexPromise, deleteReferenceESIndexPromise]);

      const repoService = this.repoServiceFactory.newInstance(
        this.serverOptions.repoPath,
        this.serverOptions.credsPath,
        this.log,
        this.serverOptions.security.enableGitCertCheck
      );
      this.gitOps.cleanRepo(uri);
      await this.deletePromiseWrapper(repoService.remove(uri), 'git data', uri);

      // 4. Delete the document index and alias where the repository document and all status reside,
      // so that you won't be able to import the same repositories until they are
      // fully removed.
      await this.deletePromiseWrapper(
        this.client.indices.delete({ index: `${DocumentIndexName(uri)}*` }),
        'document ES index',
        uri
      );

      return {
        uri,
        res: true,
      };
    } catch (error) {
      this.log.error(`Delete repository ${uri} error.`);
      this.log.error(error);
      return {
        uri,
        res: false,
      };
    }
  }

  public async onJobEnqueued(job: Job) {
    const repoUri = job.payload.uri;
    const progress: WorkerProgress = {
      uri: repoUri,
      progress: WorkerReservedProgress.INIT,
      timestamp: new Date(),
    };
    return await this.objectClient.setRepositoryDeleteStatus(repoUri, progress);
  }

  public async updateProgress(job: Job, progress: number) {
    const { uri } = job.payload;
    const p: WorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
    };
    if (progress !== WorkerReservedProgress.COMPLETED) {
      return await this.objectClient.updateRepositoryDeleteStatus(uri, p);
    }
  }

  protected async getTimeoutMs(_: any) {
    return (
      moment.duration(1, 'hour').asMilliseconds() + moment.duration(10, 'minutes').asMilliseconds()
    );
  }

  private deletePromiseWrapper(
    promise: Promise<any>,
    type: string,
    repoUri: RepositoryUri
  ): Promise<any> {
    return promise
      .then(() => {
        this.log.info(`Delete ${type} of repository ${repoUri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete ${type} of repository ${repoUri} error.`);
        this.log.error(error);
      });
  }
}
