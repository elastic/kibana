/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';

/** Parameters for {@link StorageServiceContract.bulkIndexDocs}. */
export interface BulkIndexDocsParams<TDocument extends Record<string, unknown>> {
  index: string;
  docs: readonly TDocument[];
  /** When `'wait_for'`, the bulk call blocks until the indexed documents are visible to search. Defaults to `false`. */
  refresh?: boolean | 'wait_for';
}

/**
 * Parameters for {@link StorageServiceContract.bulkIndexDocsAcrossIndices}.
 *
 * The doc element is intentionally typed as `Record<string, unknown>` rather
 * than a generic: this method is for heterogeneous batches (different shapes
 * per element), and tying every doc to a single `TDocument` either forces
 * callers to spell out the union or breaks inference. Each caller composes
 * the batch from its own typed inputs and the runtime is shape-agnostic.
 */
export interface BulkIndexDocsAcrossIndicesParams {
  docs: ReadonlyArray<{ index: string; doc: Record<string, unknown> }>;
  /** When `'wait_for'`, the bulk call blocks until the indexed documents are visible to search. Defaults to `false`. */
  refresh?: boolean | 'wait_for';
}

export interface StorageServiceContract {
  /** Bulk-index N documents into a single target index. */
  bulkIndexDocs<TDocument extends Record<string, unknown>>(
    params: BulkIndexDocsParams<TDocument>
  ): Promise<void>;

  /**
   * Bulk-index N documents where each doc carries its own target index.
   *
   * Use when one logical operation must atomically fan out across data
   * streams (e.g. writing a rule event and an audit action in one round-trip).
   * Operations are submitted in array order.
   */
  bulkIndexDocsAcrossIndices(params: BulkIndexDocsAcrossIndicesParams): Promise<void>;
}

@injectable()
export class StorageService implements StorageServiceContract {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async bulkIndexDocs<TDocument extends Record<string, unknown>>(
    params: BulkIndexDocsParams<TDocument>
  ): Promise<void> {
    const entries = params.docs.map((doc) => ({ index: params.index, doc }));
    await this.writeBulk(entries, params.refresh ?? false);
  }

  public async bulkIndexDocsAcrossIndices(params: BulkIndexDocsAcrossIndicesParams): Promise<void> {
    await this.writeBulk(params.docs, params.refresh ?? false);
  }

  private async writeBulk<TDocument extends Record<string, unknown>>(
    entries: ReadonlyArray<{ index: string; doc: TDocument }>,
    refresh: boolean | 'wait_for'
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const operations: NonNullable<BulkRequest<TDocument>['operations']> = entries.flatMap(
      ({ index, doc }) => [{ create: { _index: index } }, doc]
    );

    const indexLabel = Array.from(new Set(entries.map((entry) => entry.index))).join(', ');

    try {
      const response = await this.esClient.bulk({
        operations,
        refresh,
      });

      this.logBulkIndexResponse({ index: indexLabel, docsCount: entries.length, response });
    } catch (error) {
      this.logger.error({
        error,
        code: 'BULK_INDEX_ERROR',
        type: 'StorageServiceError',
      });

      throw error;
    }
  }

  private logBulkIndexResponse({
    index,
    docsCount,
    response,
  }: {
    index: string;
    docsCount: number;
    response: BulkResponse;
  }): void {
    this.logFirstBulkIndexItemError(response);
    const message = this.getBulkIndexDebugMessage({ index, docsCount, response });
    this.logger.debug({ message });
  }

  private logFirstBulkIndexItemError(response: BulkResponse): void {
    if (!response.errors) {
      return;
    }

    const firstErrorItem = response.items.find((item) => item.create?.error);
    if (!firstErrorItem) {
      return;
    }

    const error = firstErrorItem.create?.error;
    this.logger.error({
      error: new Error(`[${error?.type ?? 'UNKNOWN_ERROR'}] ${error?.reason ?? 'UNKNOWN_REASON'}`),
      code: 'BULK_INDEX_ERROR',
      type: 'StorageServiceError',
    });
  }

  private getBulkIndexDebugMessage({
    index,
    docsCount,
    response,
  }: {
    index: string;
    docsCount: number;
    response: BulkResponse;
  }): string {
    const failedItemCount = response.items.filter((item) => item.create?.error).length;

    if (!response.errors) {
      return `StorageService: Successfully bulk created ${docsCount} documents to index: ${index}`;
    }

    const successItemCount = docsCount - failedItemCount;
    return `StorageService: Bulk create completed with errors for index: ${index} (successful: ${successItemCount}, failed: ${failedItemCount}, total: ${docsCount})`;
  }
}
