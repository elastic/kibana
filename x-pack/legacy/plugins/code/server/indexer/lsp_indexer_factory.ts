/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Indexer, IndexerFactory, LspIncrementalIndexer, LspIndexer } from '.';
import { RepositoryUri } from '../../model';
import { GitOperations } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';

export class LspIndexerFactory implements IndexerFactory {
  private objectClient: RepositoryObjectClient;

  constructor(
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly gitOps: GitOperations,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    this.objectClient = new RepositoryObjectClient(this.client);
  }

  public async create(
    repoUri: RepositoryUri,
    revision: string,
    enforcedReindex: boolean = false
  ): Promise<Indexer | undefined> {
    try {
      const repo = await this.objectClient.getRepository(repoUri);
      const indexedRevision = repo.indexedRevision;
      // Skip incremental indexer if enforced reindex.
      if (!enforcedReindex && indexedRevision) {
        this.log.info(`Create indexer to index ${repoUri} from ${indexedRevision} to ${revision}`);
        // Create the indexer to index only the diff between these 2 revisions.
        return new LspIncrementalIndexer(
          repoUri,
          revision,
          indexedRevision,
          this.lspService,
          this.options,
          this.gitOps,
          this.client,
          this.log
        );
      } else {
        this.log.info(`Create indexer to index ${repoUri} at ${revision}`);
        // Create the indexer to index the entire repository.
        return new LspIndexer(
          repoUri,
          revision,
          this.lspService,
          this.options,
          this.gitOps,
          this.client,
          this.log
        );
      }
    } catch (error) {
      this.log.error(`Create indexer error for ${repoUri}.`);
      this.log.error(error);
      return undefined;
    }
  }
}
