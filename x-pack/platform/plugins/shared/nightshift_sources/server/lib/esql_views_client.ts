/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { toBoom } from './es_errors';

export type EsqlView = estypes.EsqlESQLView;

// Parallel `PUT /_query/view` calls can hit a `ConcurrentModificationException` in ES; Streams
// serialises its own upserts for the same reason. Two users creating sources at once is the
// realistic trigger here, so a short retry is enough.
const RETRYABLE_STATUS_CODES = [409, 429, 503];
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

export interface EsRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
}

const isRetryable = (error: unknown): boolean =>
  error instanceof errors.ElasticsearchClientError &&
  isRetryableEsClientError(error, RETRYABLE_STATUS_CODES);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withEsRetry = async <T>(
  operation: () => Promise<T>,
  { attempts = RETRY_ATTEMPTS, baseDelayMs = RETRY_BASE_DELAY_MS }: EsRetryOptions
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) {
        throw error;
      }
      await sleep(baseDelayMs * attempt);
    }
  }
};

/**
 * Thin wrapper over the ES|QL view APIs, running as the current user: view operations are
 * index privileges on the view name (`manage` or `create_view` / `read_view_metadata` /
 * `delete_view`), so callers need them on `$.nightshift.sources.*`.
 */
export class EsqlViewsClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly retryOptions: EsRetryOptions = {}
  ) {}

  async putView(name: string, query: string): Promise<void> {
    try {
      await withEsRetry(() => this.esClient.esql.putView({ name, query }), this.retryOptions);
    } catch (error) {
      throw toBoom(error, `Failed to write ES|QL view "${name}"`);
    }
  }

  /**
   * A missing view surfaces either as a 404 (whose ignored body has no `views`) or as a 200 with
   * an empty `views` list depending on the ES version; both resolve to `undefined`.
   */
  async getView(name: string): Promise<EsqlView | undefined> {
    try {
      const { views } = await this.esClient.esql.getView({ name }, { ignore: [404] });
      return Array.isArray(views) ? views.find((view) => view.name === name) : undefined;
    } catch (error) {
      throw toBoom(error, `Failed to read ES|QL view "${name}"`);
    }
  }

  async deleteView(name: string): Promise<void> {
    try {
      await withEsRetry(
        () => this.esClient.esql.deleteView({ name }, { ignore: [404] }),
        this.retryOptions
      );
    } catch (error) {
      throw toBoom(error, `Failed to delete ES|QL view "${name}"`);
    }
  }
}
