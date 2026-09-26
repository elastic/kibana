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
import { createLogOnce, type CatalogLogOnce } from './log_once';
import { runCatalogRefresh } from './catalog_refresh';
import {
  loadCatalogFromIndex,
  type CatalogRegistryDeps,
  type VersionedTypeFactory,
} from './catalog_loader';
import type { PinnedVersionsClient } from './pinned_versions';
import type { VersionedConnectorType } from './versioned_connector_type';

export interface DeclarativeCatalogServiceOptions {
  source: CatalogSource;
  publicKeys: readonly string[];
  refreshIntervalMs: number;
  logger: Logger;
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
  private refreshing?: Promise<void>;
  private loading?: Promise<void>;
  private deps?: DeclarativeCatalogRegistrationDeps;
  private storage?: ConnectorCatalogStorage;
  private logOnce?: CatalogLogOnce;
  private readonly types = new Map<string, VersionedConnectorType>();
  private indexPoll?: ReturnType<typeof setInterval>;
  private readonly createStorage: (
    esClient: ElasticsearchClient,
    logger: Logger
  ) => ConnectorCatalogStorage;

  constructor(private readonly options: DeclarativeCatalogServiceOptions) {
    this.createStorage = options.createStorage ?? createConnectorCatalogStorage;
  }

  public async loadAtBoot(deps: DeclarativeCatalogRegistrationDeps): Promise<void> {
    this.deps = deps;
    this.setStorage(this.createStorage(deps.esClient, this.options.logger));
    this.logOnce = createLogOnce(this.options.logger);
    this.startReloadInterval();
    await this.loadFromIndex();
  }

  public stop(): void {
    if (this.indexPoll) {
      clearInterval(this.indexPoll);
      this.indexPoll = undefined;
    }
  }

  public refresh = async (): Promise<void> => {
    if (this.refreshing) {
      return this.refreshing;
    }
    this.refreshing = this.runRefresh().finally(() => {
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

  private async loadFromIndex(): Promise<void> {
    if (this.loading) {
      return this.loading;
    }
    this.loading = this.runLoad().finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async runLoad(): Promise<void> {
    const { deps, storage, logOnce } = this;
    if (!deps || !storage || !logOnce) {
      return;
    }
    await loadCatalogFromIndex({
      storage,
      publicKeys: this.options.publicKeys,
      registry: deps,
      pinnedClient: deps.savedObjectsRepository,
      buildType: this.options.buildType,
      types: this.types,
      logger: this.options.logger,
      logOnce,
    });
  }

  private async runRefresh(): Promise<void> {
    const { storage, logOnce } = this;
    if (!storage || !logOnce) {
      return;
    }
    await runCatalogRefresh({
      source: this.options.source,
      storage,
      publicKeys: this.options.publicKeys,
      logger: this.options.logger,
      logOnce,
      reload: () => this.loadFromIndex(),
    });
  }

  private setStorage(storage: ConnectorCatalogStorage): void {
    this.storage = storage;
    this.options.onStorageReady?.(storage);
  }
}
