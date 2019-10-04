/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError } from 'vscode-jsonrpc';

import { ProgressReporter } from '.';
import { TEXT_FILE_LIMIT } from '../../common/file';
import {
  LanguageServerNotInstalled,
  LanguageServerStartFailed,
} from '../../common/lsp_error_codes';
import { toCanonicalUrl } from '../../common/uri_util';
import {
  Document,
  IndexStats,
  IndexStatsKey,
  IndexerType,
  LspIndexRequest,
  RepositoryUri,
} from '../../model';
import { GitOperations, HEAD } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { detectLanguage, detectLanguageByFilename } from '../utils/detect_language';
import { AbstractIndexer } from './abstract_indexer';
import { BatchIndexHelper } from './batch_index_helper';
import {
  getDocumentIndexCreationRequest,
  getReferenceIndexCreationRequest,
  getSymbolIndexCreationRequest,
} from './index_creation_request';
import { ALL_RESERVED, DocumentIndexName, ReferenceIndexName, SymbolIndexName } from './schema';

export class LspIndexer extends AbstractIndexer {
  public type: IndexerType = IndexerType.LSP;
  // Batch index helper for symbols/references
  protected lspBatchIndexHelper: BatchIndexHelper;
  // Batch index helper for documents
  protected docBatchIndexHelper: BatchIndexHelper;

  private LSP_BATCH_INDEX_SIZE = 50;
  private DOC_BATCH_INDEX_SIZE = 50;

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly gitOps: GitOperations,
    protected readonly client: EsClient,
    protected log: Logger
  ) {
    super(repoUri, revision, client, log);
    this.lspBatchIndexHelper = new BatchIndexHelper(client, log, this.LSP_BATCH_INDEX_SIZE);
    this.docBatchIndexHelper = new BatchIndexHelper(client, log, this.DOC_BATCH_INDEX_SIZE);
  }

  public async start(progressReporter?: ProgressReporter, checkpointReq?: LspIndexRequest) {
    try {
      return await super.start(progressReporter, checkpointReq);
    } finally {
      if (!this.isCancelled()) {
        // Flush all the index request still in the cache for bulk index.
        this.lspBatchIndexHelper.flush();
        this.docBatchIndexHelper.flush();
      }
    }
  }

  public cancel() {
    this.lspBatchIndexHelper.cancel();
    this.docBatchIndexHelper.cancel();
    super.cancel();
  }

  // If the current checkpoint is valid
  protected validateCheckpoint(checkpointReq?: LspIndexRequest): boolean {
    return checkpointReq !== undefined && checkpointReq.revision === this.revision;
  }

  // If it's necessary to refresh (create and reset) all the related indices
  protected needRefreshIndices(checkpointReq?: LspIndexRequest): boolean {
    // If it's not resumed from a checkpoint, then try to refresh all the indices.
    return !this.validateCheckpoint(checkpointReq);
  }

  protected ifCheckpointMet(req: LspIndexRequest, checkpointReq: LspIndexRequest): boolean {
    // Assume for the same revision, the order of the files we iterate the repository is definite
    // everytime.
    return req.filePath === checkpointReq.filePath && req.revision === checkpointReq.revision;
  }

  protected async prepareIndexCreationRequests() {
    return [
      getDocumentIndexCreationRequest(this.repoUri),
      getReferenceIndexCreationRequest(this.repoUri),
      getSymbolIndexCreationRequest(this.repoUri),
    ];
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<LspIndexRequest> {
    try {
      const fileIterator = await this.gitOps.iterateRepo(this.repoUri, HEAD);
      for await (const file of fileIterator) {
        const filePath = file.path!;
        const req: LspIndexRequest = {
          repoUri: this.repoUri,
          filePath,
          // Always use HEAD for now until we have multi revision.
          // Also, since the workspace might get updated during the index, we always
          // want the revision to keep updated so that lsp proxy could pass the revision
          // check per discussion here: https://github.com/elastic/code/issues/1317#issuecomment-504615833
          revision: HEAD,
        };
        yield req;
      }
    } catch (error) {
      this.log.error(`Prepare ${this.type} indexing requests error.`);
      this.log.error(error);
      throw error;
    }
  }

  protected async getIndexRequestCount(): Promise<number> {
    try {
      return await this.gitOps.countRepoFiles(this.repoUri, HEAD);
    } catch (error) {
      if (this.isCancelled()) {
        this.log.debug(`Indexer ${this.type} got cancelled. Skip get index count error.`);
        return 1;
      } else {
        this.log.error(`Get ${this.type} index requests count error.`);
        this.log.error(error);
        throw error;
      }
    }
  }

  protected async cleanIndex() {
    // Clean up all the symbol documents in the symbol index
    try {
      await this.client.deleteByQuery({
        index: SymbolIndexName(this.repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up symbols for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up symbols for ${this.repoUri} error.`);
      this.log.error(error);
    }

    // Clean up all the reference documents in the reference index
    try {
      await this.client.deleteByQuery({
        index: ReferenceIndexName(this.repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up references for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up references for ${this.repoUri} error.`);
      this.log.error(error);
    }

    // Clean up all the document documents in the document index but keep the repository document.
    try {
      await this.client.deleteByQuery({
        index: DocumentIndexName(this.repoUri),
        body: {
          query: {
            bool: {
              must_not: ALL_RESERVED.map((field: string) => ({
                exists: {
                  field,
                },
              })),
            },
          },
        },
      });
      this.log.info(`Clean up documents for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up documents for ${this.repoUri} error.`);
      this.log.error(error);
    }
  }

  protected FILE_OVERSIZE_ERROR_MSG = 'File size exceeds limit. Skip index.';
  protected async getFileSource(request: LspIndexRequest): Promise<string> {
    const { revision, filePath } = request;
    // Always read file content from the original bare repo
    const blob = await this.gitOps.fileContent(this.repoUri, filePath, revision);
    if (blob.rawsize() > TEXT_FILE_LIMIT) {
      throw new Error(this.FILE_OVERSIZE_ERROR_MSG);
    }
    return blob.content().toString();
  }

  protected async execLspIndexing(
    request: LspIndexRequest
  ): Promise<{
    symbolNames: Set<string>;
    symbolsLength: number;
    referencesLength: number;
  }> {
    const { repoUri, revision, filePath } = request;
    const lspDocUri = toCanonicalUrl({ repoUri, revision, file: filePath, schema: 'git:' });
    const symbolNames = new Set<string>();
    let symbolsLength = 0;
    let referencesLength = 0;
    try {
      const lang = detectLanguageByFilename(filePath);
      // filter file by language
      if (lang && this.lspService.supportLanguage(lang)) {
        const response = await this.lspService.sendRequest('textDocument/full', {
          textDocument: {
            uri: lspDocUri,
          },
          reference: this.options.enableGlobalReference,
        });

        if (response && response.result && response.result.length > 0 && response.result[0]) {
          const { symbols, references } = response.result[0];
          for (const symbol of symbols) {
            await this.lspBatchIndexHelper.index(SymbolIndexName(repoUri), symbol);
            symbolNames.add(symbol.symbolInformation.name);
          }
          symbolsLength = symbols.length;

          for (const ref of references) {
            await this.lspBatchIndexHelper.index(ReferenceIndexName(repoUri), ref);
          }
          referencesLength = references.length;
        } else {
          this.log.debug(`Empty response from lsp server. Skip symbols and references indexing.`);
        }
      } else {
        this.log.debug(`Unsupported language. Skip symbols and references indexing.`);
      }
    } catch (error) {
      if (error instanceof ResponseError && error.code === LanguageServerNotInstalled) {
        // TODO maybe need to report errors to the index task and warn user later
        this.log.debug(`Index symbols or references error due to language server not installed`);
      } else if (error instanceof ResponseError && error.code === LanguageServerStartFailed) {
        this.log.debug(
          `Index symbols or references error due to language server can't be started.`
        );
      } else {
        this.log.warn(`Index symbols or references error.`);
        this.log.warn(error);
      }
    }

    return { symbolNames, symbolsLength, referencesLength };
  }

  protected async processRequest(request: LspIndexRequest): Promise<IndexStats> {
    const stats: IndexStats = new Map<IndexStatsKey, number>()
      .set(IndexStatsKey.Symbol, 0)
      .set(IndexStatsKey.Reference, 0)
      .set(IndexStatsKey.File, 0);
    const { repoUri, revision, filePath } = request;
    this.log.debug(`Indexing ${filePath} at revision ${revision} for ${repoUri}`);

    let content = '';
    try {
      content = await this.getFileSource(request);
    } catch (error) {
      if ((error as Error).message === this.FILE_OVERSIZE_ERROR_MSG) {
        // Skip this index request if the file is oversized
        this.log.debug(this.FILE_OVERSIZE_ERROR_MSG);
        return stats;
      } else {
        // Rethrow the issue if for other reasons
        throw error;
      }
    }

    const { symbolNames, symbolsLength, referencesLength } = await this.execLspIndexing(request);
    stats.set(IndexStatsKey.Symbol, symbolsLength);
    stats.set(IndexStatsKey.Reference, referencesLength);

    const language = await detectLanguage(filePath, Buffer.from(content));
    const body: Document = {
      repoUri,
      path: filePath,
      content,
      language,
      qnames: Array.from(symbolNames),
    };
    await this.docBatchIndexHelper.index(DocumentIndexName(repoUri), body);
    stats.set(IndexStatsKey.File, 1);
    return stats;
  }
}
