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
import { loadCatalogFromIndex } from './catalog_loader';
import type { CatalogLogOnce } from './log_once';
import { verifyCatalogSignature } from './signature';
import type {
  CatalogRefreshResult,
  CatalogRegistryDeps,
  CatalogSource,
  CatalogTypeBuilder,
  LoadCatalogFromIndexResult,
  RegisteredCatalogType,
} from './types';
import { CATALOG_LOAD_TIMEOUT_MS, withCatalogTimeout } from './with_timeout';

const BOOT_FETCH_CONCURRENCY = 20;

export interface CatalogBootDeps extends CatalogRegistryDeps {
  esClient: ElasticsearchClient;
}

export interface CatalogServiceOptions {
  source: CatalogSource;
  publicKeys: readonly string[];
  refreshIntervalMs: number;
  logger: Logger;
  logOnce: CatalogLogOnce;
  buildType?: CatalogTypeBuilder;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
}

export class CatalogService {
  private refreshing?: Promise<CatalogRefreshResult | undefined>;
  private loading?: Promise<LoadCatalogFromIndexResult>;
  private storage?: ConnectorCatalogStorage;
  private registryDeps?: CatalogRegistryDeps;
  private indexPoll?: ReturnType<typeof setInterval>;
  private readonly registered = new Map<string, RegisteredCatalogType>();
  private readonly notices = new Set<string>();
  private readonly createStorage: (
    esClient: ElasticsearchClient,
    logger: Logger
  ) => ConnectorCatalogStorage;

  constructor(private readonly options: CatalogServiceOptions) {
    this.createStorage = options.createStorage ?? createConnectorCatalogStorage;
  }

  public async loadAtBoot(deps: CatalogBootDeps, bootFetch?: { timeoutMs: number }): Promise<void> {
    this.registryDeps = deps;
    this.storage = this.createStorage(deps.esClient, this.options.logger);
    this.startReloadInterval();
    await withCatalogTimeout(
      this.loadFromIndex(),
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

  public getRegisteredTypes(): ReadonlyMap<string, RegisteredCatalogType> {
    return this.registered;
  }

  public stop(): void {
    if (this.indexPoll) {
      clearInterval(this.indexPoll);
      this.indexPoll = undefined;
    }
  }

  private startReloadInterval(): void {
    if (this.indexPoll) {
      return;
    }
    this.indexPoll = setInterval(() => {
      void this.loadFromIndex();
    }, this.options.refreshIntervalMs);
    this.indexPoll.unref?.();
  }

  private loadFromIndex(): Promise<LoadCatalogFromIndexResult> {
    if (this.loading) {
      return this.loading;
    }
    this.loading = this.runLoad().finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async runLoad(): Promise<LoadCatalogFromIndexResult> {
    if (!this.storage || !this.registryDeps) {
      return { registered: 0, manifestPresent: false, definitions: 0 };
    }
    return loadCatalogFromIndex({
      storage: this.storage,
      publicKeys: this.options.publicKeys,
      registry: this.registryDeps,
      buildType: this.options.buildType,
      registered: this.registered,
      logger: this.options.logger,
      logOnce: this.options.logOnce,
      notices: this.notices,
    });
  }

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
        await this.loadFromIndex();
      },
      fetchConcurrency: options?.fetchConcurrency,
      signal: options?.signal,
    });
  }
}
