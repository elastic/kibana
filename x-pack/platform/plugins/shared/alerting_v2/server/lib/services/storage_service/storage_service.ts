/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { LoggerService } from '../logger_service';

interface BulkIndexDocsParams {
  index: string;
  docs: Record<string, any>[];
}

export class StorageService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: LoggerService
  ) {}

  public async bulkIndexDocs({ index, docs }: BulkIndexDocsParams): Promise<void> {
    if (docs.length === 0) {
      return;
    }

    const operations = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);

    try {
      const response = await this.esClient.bulk({
        operations,
        refresh: 'wait_for',
      });

      this.logFirstError(response);

      this.logger.debug({
        message: `StorageService: Successfully bulk indexed ${docs.length} documents to index: ${index}`,
      });
    } catch (error) {
      this.logger.error({
        error,
        code: 'BULK_INDEX_ERROR',
        type: 'StorageServiceError',
      });

      throw error;
    }
  }

  private logFirstError(response: BulkResponse): void {
    if (response.errors) {
      const firstErrorItem = response.items.find((item) => item.index?.error);

      if (firstErrorItem) {
        const error = firstErrorItem.index?.error;

        this.logger.error({
          error: new Error(
            `[${error?.type ?? 'UNKNOWN_ERROR'}] ${error?.reason ?? 'UNKNOWN_REASON'}`
          ),
          code: 'BULK_INDEX_ERROR',
          type: 'StorageServiceError',
        });
      }
    }
  }
}
