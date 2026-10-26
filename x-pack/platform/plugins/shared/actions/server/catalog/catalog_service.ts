/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { createConnectorCatalogStorage } from './catalog_storage';
import { runCatalogRefresh } from './catalog_refresh';
import type { CatalogLogOnce } from './log_once';
import { verifyCatalogSignature } from './signature';
import type { CatalogRefreshResult, CatalogSource } from './types';
import { CATALOG_LOAD_TIMEOUT_MS, withCatalogTimeout } from './with_timeout';

const BOOT_FETCH_CONCURRENCY = 20;

export interface CatalogBootDeps {
  esClient: ElasticsearchClient;
}

export interface CatalogServiceOptions {
  source: CatalogSource;
  publicKeys: readonly string[];
  refreshIntervalMs: number;
  logger: Logger;
  logOnce: CatalogLogOnce;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
}

export class CatalogService {
  private refreshing?: Promise<CatalogRefreshResult | undefined>;
  private storage?: ConnectorCatalogStorage;
  private readonly createStorage: (
    esClient: ElasticsearchClient,
    logger: Logger
  ) => ConnectorCatalogStorage;

  constructor(private readonly options: CatalogServiceOptions) {
    this.createStorage = options.createStorage ?? createConnectorCatalogStorage;
  }

  public async loadAtBoot(deps: CatalogBootDeps, bootFetch?: { timeoutMs: number }): Promise<void> {
    this.storage = this.createStorage(deps.esClient, this.options.logger);
    const stored = await withCatalogTimeout(
      this.storage.getManifest(),
      CATALOG_LOAD_TIMEOUT_MS,
      () => {
        this.options.logger.warn(
          'Connector catalog load timed out; starting with in-tree types only'
        );
        return undefined;
      },
      (error) => {
        this.options.logger.warn(
          `Connector catalog index read failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return undefined;
      }
    );
    const verified =
      stored !== undefined &&
      verifyCatalogSignature(stored.bytes, stored.signature, this.options.publicKeys);
    if (verified || bootFetch === undefined) {
      if (stored && !verified) {
        this.options.logger.warn(
          'Stored connector catalog signature verification failed; leaving it unused until refresh'
        );
      }
      return;
    }
    if (stored && !verified) {
      this.options.logger.warn(
        'Stored connector catalog signature verification failed; fetching a replacement'
      );
    } else {
      this.options.logger.info('Connector catalog index is empty; fetching the catalog at boot');
    }
    await withCatalogTimeout(
      this.runBootFetch(),
      bootFetch.timeoutMs,
      () => {
        this.options.logger.warn(
          `Connector catalog boot fetch exceeded ${bootFetch.timeoutMs}ms; continuing in the background`
        );
      },
      (error) => {
        this.options.logger.warn(
          `Connector catalog boot fetch failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    );
  }

  public refresh = async (options?: {
    signal?: AbortSignal;
    fetchConcurrency?: number;
  }): Promise<CatalogRefreshResult | undefined> => {
    if (this.refreshing) {
      return this.refreshing;
    }
    this.refreshing = this.runRefresh(options).finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  };

  public stop(): void {}

  private async runBootFetch(): Promise<void> {
    const refreshResult = await this.refresh({ fetchConcurrency: BOOT_FETCH_CONCURRENCY });
    this.options.logger.info(
      `Connector catalog boot fetch finished (${refreshResult?.outcome ?? 'skipped'})`
    );
  }

  private async runRefresh(options?: {
    signal?: AbortSignal;
    fetchConcurrency?: number;
  }): Promise<CatalogRefreshResult | undefined> {
    const { storage } = this;
    if (!storage) {
      return undefined;
    }
    return runCatalogRefresh({
      source: this.options.source,
      storage,
      publicKeys: this.options.publicKeys,
      logOnce: this.options.logOnce,
      reload: async () => {
        // Registration reload lands with the builder seam.
      },
      fetchConcurrency: options?.fetchConcurrency,
      signal: options?.signal,
    });
  }
}
