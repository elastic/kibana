/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CatalogSource } from './types';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { createConnectorCatalogStorage } from './catalog_storage';
import type { CatalogLogOnce } from './log_once';
import { runCatalogRefresh, type CatalogRefreshResult } from './catalog_refresh';
import {
  loadCatalogFromIndex,
  type CatalogRegistryDeps,
  type LoadCatalogFromIndexResult,
  type VersionedTypeFactory,
} from './catalog_loader';
import type { PinnedVersionsClient } from './pinned_versions';
import type { VersionedConnectorType } from './versioned_connector_type';
import { CATALOG_LOAD_TIMEOUT_MS, withCatalogTimeout } from './with_timeout';

const BOOT_FETCH_CONCURRENCY = 20;

export interface CatalogBootFetchOptions {
  timeoutMs: number;
}

export interface CatalogRefreshOptions {
  fetchConcurrency?: number;
  skipIcons?: boolean;
}

export interface DeclarativeCatalogServiceOptions {
  source: CatalogSource;
  publicKeys: readonly string[];
  refreshIntervalMs: number;
  logger: Logger;
  logOnce: CatalogLogOnce;
  buildType: VersionedTypeFactory;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
  onStorageReady?: (storage: ConnectorCatalogStorage) => void;
}

export interface DeclarativeCatalogRegistrationDeps extends CatalogRegistryDeps {
  esClient: ElasticsearchClient;
  savedObjectsRepository: PinnedVersionsClient;
}

/**
 * Owns catalog storage, the refresh task entry, and the per-node reload interval.
 */
export class DeclarativeCatalogService {
  private refreshing?: Promise<CatalogRefreshResult | undefined>;
  private loading?: Promise<LoadCatalogFromIndexResult>;
  private deps?: DeclarativeCatalogRegistrationDeps;
  private storage?: ConnectorCatalogStorage;
  private readonly logOnce: CatalogLogOnce;
  private readonly types = new Map<string, VersionedConnectorType>();
  private indexPoll?: ReturnType<typeof setInterval>;
  private readonly createStorage: (
    esClient: ElasticsearchClient,
    logger: Logger
  ) => ConnectorCatalogStorage;

  constructor(private readonly options: DeclarativeCatalogServiceOptions) {
    this.createStorage = options.createStorage ?? createConnectorCatalogStorage;
    this.logOnce = options.logOnce;
  }

  public async loadAtBoot(
    deps: DeclarativeCatalogRegistrationDeps,
    bootFetch?: CatalogBootFetchOptions
  ): Promise<void> {
    this.deps = deps;
    this.setStorage(this.createStorage(deps.esClient, this.options.logger));
    this.startReloadInterval();
    const result = await withCatalogTimeout(this.loadFromIndex(), CATALOG_LOAD_TIMEOUT_MS, () => {
      this.options.logger.warn(
        'Connector catalog load timed out; starting with in-tree types only'
      );
      return undefined;
    });
    if (result === undefined || result.manifestPresent || bootFetch === undefined) {
      return;
    }

    this.options.logger.info('Connector catalog index is empty; fetching the catalog at boot');
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

  public stop(): void {
    if (this.indexPoll) {
      clearInterval(this.indexPoll);
      this.indexPoll = undefined;
    }
  }

  public refresh = async (
    options?: CatalogRefreshOptions
  ): Promise<CatalogRefreshResult | undefined> => {
    if (this.refreshing) {
      return this.refreshing;
    }
    this.refreshing = this.runRefresh(options).finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  };

  /** @deprecated Use refresh. */
  public refreshFromRegistry = this.refresh;

  private startReloadInterval(): void {
    this.indexPoll = setInterval(() => {
      void this.loadFromIndex();
    }, this.options.refreshIntervalMs);
    this.indexPoll.unref?.();
  }

  private async loadFromIndex(): Promise<LoadCatalogFromIndexResult> {
    if (this.loading) {
      return this.loading;
    }
    this.loading = this.runLoad().finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async runLoad(): Promise<LoadCatalogFromIndexResult> {
    const { deps, storage } = this;
    if (!deps || !storage) {
      return { registered: 0, manifestPresent: false };
    }
    return loadCatalogFromIndex({
      storage,
      publicKeys: this.options.publicKeys,
      registry: deps,
      pinnedClient: deps.savedObjectsRepository,
      buildType: this.options.buildType,
      types: this.types,
      logger: this.options.logger,
      logOnce: this.logOnce,
    });
  }

  private async runBootFetch(): Promise<void> {
    const refreshResult = await this.refresh({
      fetchConcurrency: BOOT_FETCH_CONCURRENCY,
      skipIcons: true,
    });
    const loadResult = await this.loadFromIndex();
    this.options.logger.info(
      `Connector catalog boot fetch finished (${refreshResult?.outcome ?? 'skipped'}); registered ${
        loadResult.registered
      } catalog types`
    );
  }

  private async runRefresh(
    options?: CatalogRefreshOptions
  ): Promise<CatalogRefreshResult | undefined> {
    const { storage } = this;
    if (!storage) {
      return undefined;
    }
    return runCatalogRefresh({
      source: this.options.source,
      storage,
      publicKeys: this.options.publicKeys,
      logger: this.options.logger,
      logOnce: this.logOnce,
      reload: async () => {
        await this.loadFromIndex();
      },
      fetchConcurrency: options?.fetchConcurrency,
      skipIcons: options?.skipIcons,
    });
  }

  private setStorage(storage: ConnectorCatalogStorage): void {
    this.storage = storage;
    this.options.onStorageReady?.(storage);
  }
}
