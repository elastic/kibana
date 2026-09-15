/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isEsResponseError, toBoom } from './es_errors';

export interface EsqlView {
  name: string;
  query: string;
}

// Parallel `PUT /_query/view` calls can hit a `ConcurrentModificationException` in ES; Streams
// serialises its own upserts for the same reason. Two users creating sources at once is the
// realistic trigger here, so a short retry is enough.
const RETRYABLE_STATUS_CODES = new Set([409, 429, 503]);
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

export interface EsRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
}

const isRetryable = (error: unknown): boolean =>
  isEsResponseError(error) && RETRYABLE_STATUS_CODES.has(error.statusCode ?? 0);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const withEsRetry = async <T>(
  operation: () => Promise<T>,
  { attempts = RETRY_ATTEMPTS, baseDelayMs = RETRY_BASE_DELAY_MS }: EsRetryOptions = {}
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
   * A missing view surfaces either as a 404 or as a 200 with an empty `views` list depending
   * on the ES version; both resolve to `undefined`.
   */
  async getView(name: string): Promise<EsqlView | undefined> {
    let body: unknown;
    try {
      body = await this.esClient.esql.getView({ name }, { ignore: [404] });
    } catch (error) {
      throw toBoom(error, `Failed to read ES|QL view "${name}"`);
    }
    const views = (body as { views?: unknown } | undefined)?.views;
    if (!Array.isArray(views) || views.length === 0) {
      return undefined;
    }
    const view = views.find((candidate: EsqlView) => candidate.name === name) ?? views[0];
    return { name: view.name, query: view.query };
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
