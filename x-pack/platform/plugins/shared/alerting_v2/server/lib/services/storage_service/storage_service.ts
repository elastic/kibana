/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { LoggerService } from '../logger_service/logger_service';

interface BulkIndexDocsParams<TDocument extends Record<string, unknown>> {
  index: string;
  docs: TDocument[];
  /**
   * Optional deterministic id factory.
   */
  getId?: (doc: TDocument, index: number) => string;
}

@injectable()
export class StorageService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  public async bulkIndexDocs<TDocument extends Record<string, unknown>>({
    index,
    docs,
    getId,
  }: BulkIndexDocsParams<TDocument>): Promise<void> {
    if (docs.length === 0) {
      return;
    }

    const operations: NonNullable<BulkRequest<TDocument>['operations']> = docs.flatMap((doc, i) => [
      { index: { _index: index, ...(getId ? { _id: getId(doc, i) } : {}) } },
      doc,
    ]);

    try {
      const response = await this.esClient.bulk({
        operations,
        refresh: 'wait_for',
      });

      this.logBulkIndexResponse({ index, docsCount: docs.length, response });
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

    const firstErrorItem = response.items.find((item) => item.index?.error);
    if (!firstErrorItem) {
      return;
    }

    const error = firstErrorItem.index?.error;
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
    const failedItemCount = response.items.filter((item) => item.index?.error).length;

    if (!response.errors) {
      return `StorageService: Successfully bulk indexed ${docsCount} documents to index: ${index}`;
    }

    const successItemCount = docsCount - failedItemCount;
    return `StorageService: Bulk index completed with errors for index: ${index} (successful: ${successItemCount}, failed: ${failedItemCount}, total: ${docsCount})`;
  }
}
