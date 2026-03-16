/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getInferenceEndpoints } from './get_inference_endpoints';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory cache that maintains a Set of known inference endpoint IDs,
 * refreshed periodically via `GET /_inference`. Used to resolve whether
 * a given identifier is a connector or an inference endpoint.
 */
export class InferenceEndpointIdCache {
  private knownIds: Set<string> = new Set();
  private lastRefresh: number = 0;
  private refreshPromise: Promise<void> | null = null;
  private readonly ttlMs: number;
  private esClient?: ElasticsearchClient;

  constructor(options?: { ttlMs?: number; esClient?: ElasticsearchClient }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    if (options?.esClient) {
      this.esClient = options.esClient;
    }
  }

  setEsClient(esClient: ElasticsearchClient): void {
    this.esClient = esClient;
    this.invalidate();
  }

  async has(id: string): Promise<boolean> {
    if (this.knownIds.has(id)) {
      void this.updateCacheIfExpired(); // deleted endpoints are very unlikely so safe to refresh lazily without awaiting
      return true;
    }
    await this.updateCacheIfExpired(); // id not in cache, make sure we have latest data before returning
    return this.knownIds.has(id);
  }

  async updateCacheIfExpired(): Promise<void> {
    if (Date.now() - this.lastRefresh < this.ttlMs) return;
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    await this.refreshPromise;
  }

  invalidate(): void {
    this.lastRefresh = 0;
  }

  private async refresh(): Promise<void> {
    if (!this.esClient) {
      throw new Error('Elasticsearch client is not set');
    }
    const endpoints = await getInferenceEndpoints({
      esClient: this.esClient,
      taskType: 'chat_completion',
    });
    this.knownIds = new Set(endpoints.map((ep) => ep.inferenceId));
    this.lastRefresh = Date.now();
  }
}
