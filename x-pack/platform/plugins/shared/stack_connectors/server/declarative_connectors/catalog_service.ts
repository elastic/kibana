/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { DeclarativeCatalogHealth, DeclarativeCatalogSkippedEntry } from './types';
import type { CatalogSnapshot, CatalogSpecSource } from './catalog_spec_source';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import { createConnectorCatalogStorage, definitionDocId } from './catalog_storage';
import { getContentHash } from './icon';
import { loadDeclarativeConnectorSpec } from './load_declarative_specs';
import { parseDeclarativeConnectorSpec } from './parse_spec';
import type { RawConnectorSpecAsset } from './spec_source';

export interface DeclarativeCatalogServiceOptions {
  source: CatalogSpecSource;
  registryUrl: string;
  refreshIntervalMs: number;
  kibanaMinor: string;
  logger: Logger;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
}

export interface DeclarativeCatalogRegistrationDeps {
  registerSpec: (spec: ConnectorSpec) => void;
  isTypeRegistered: (actionTypeId: string) => boolean;
  esClient: ElasticsearchClient;
}

/** Persists catalog snapshots and late-registers new spec ids. */
export class DeclarativeCatalogService {
  private snapshot?: CatalogSnapshot;
  private refreshing?: Promise<void>;
  private lastRefreshAt?: string;
  private lastError?: { message: string; at: string };
  private deps?: DeclarativeCatalogRegistrationDeps;
  private registeredTypeIds: string[] = [];
  private indexReady = false;
  private indexCatalogVersion?: string;
  private readonly createStorage: (
    esClient: ElasticsearchClient,
    logger: Logger
  ) => ConnectorCatalogStorage;

  constructor(private readonly options: DeclarativeCatalogServiceOptions) {
    this.createStorage = options.createStorage ?? createConnectorCatalogStorage;
  }

  public async start(deps: DeclarativeCatalogRegistrationDeps): Promise<void> {
    this.deps = deps;
  }

  public stop(): void {}

  public recordIndexBoot({
    specs,
    view,
  }: {
    specs: ConnectorSpec[];
    view?: StoredCatalogView;
  }): void {
    this.registeredTypeIds = specs.map((spec) => spec.metadata.id);
    if (!view) {
      return;
    }
    this.indexReady = true;
    this.indexCatalogVersion = view.catalogVersion;
    this.snapshot = {
      catalogVersion: view.catalogVersion,
      versions: view.rows.map((row) => ({
        id: row.id,
        version: row.version,
        status: 'active',
      })),
      assets: [],
      skipped: [],
    };
  }

  public refresh = async (): Promise<void> => this.refreshFromRegistry();

  public refreshFromRegistry = async (): Promise<void> => {
    if (this.refreshing) {
      return this.refreshing;
    }
    this.refreshing = this.runRefreshFromRegistry().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  };

  public getHealth(): DeclarativeCatalogHealth {
    return {
      enabled: true,
      ready: this.registeredTypeIds.length > 0 || this.indexReady,
      sourceUrl: this.options.registryUrl,
      activeCatalogVersion: this.snapshot?.catalogVersion,
      versions: this.snapshot?.versions ?? [],
      registeredTypeIds: [...this.registeredTypeIds],
      skipped: this.snapshot?.skipped ?? [],
      lastRefreshAt: this.lastRefreshAt,
      lastError: this.lastError,
      indexReady: this.indexReady,
      indexCatalogVersion: this.indexCatalogVersion,
    };
  }

  private async runRefreshFromRegistry(): Promise<void> {
    try {
      const snapshot = await this.options.source.loadSnapshot();
      await this.persistSnapshot(snapshot);
      this.registerSnapshot(snapshot);
      this.lastRefreshAt = new Date().toISOString();
      this.lastError = undefined;
    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  private async persistSnapshot(snapshot: CatalogSnapshot): Promise<void> {
    const esClient = this.deps?.esClient;
    if (!esClient) {
      return;
    }
    const storage = this.createStorage(esClient, this.options.logger);
    const existing = await storage.getCatalogView(this.options.kibanaMinor);
    const storedHashes = new Map(
      (existing?.view.rows ?? []).map((row) => [`${row.id}@${row.version}`, row.contentHash])
    );
    const rows: StoredCatalogView['rows'] = [];

    for (const asset of snapshot.assets) {
      const parsedRow = tryParseAsset(asset);
      if (!parsedRow) {
        continue;
      }
      const { id, version, contentHash } = parsedRow;
      if (storedHashes.get(`${id}@${version}`) !== contentHash) {
        await storage.putDefinitionCreate({
          id,
          version,
          yaml: asset.yaml,
          iconSvg: asset.icon,
          contentHash,
          addedAt: new Date().toISOString(),
        });
      }
      rows.push({
        id,
        version,
        contentHash,
        definitionId: definitionDocId(id, version),
      });
    }

    const view: StoredCatalogView = {
      catalogVersion: snapshot.catalogVersion,
      fetchedAt: new Date().toISOString(),
      kibanaMinor: this.options.kibanaMinor,
      rows,
    };
    await this.writeCatalogView(storage, existing, view);
    this.indexReady = true;
    this.indexCatalogVersion = view.catalogVersion;
  }

  private async writeCatalogView(
    storage: ConnectorCatalogStorage,
    existing: Awaited<ReturnType<ConnectorCatalogStorage['getCatalogView']>>,
    view: StoredCatalogView
  ): Promise<void> {
    if (!existing) {
      await storage.putCatalogView(view);
      return;
    }
    if (existing.view.catalogVersion === view.catalogVersion) {
      return;
    }
    if (existing.seqNo === undefined || existing.primaryTerm === undefined) {
      await storage.putCatalogView(view);
      return;
    }

    const first = await storage.putCatalogViewCas(view, existing.seqNo, existing.primaryTerm);
    if (first !== 'conflict') {
      return;
    }

    const retry = await storage.getCatalogView(this.options.kibanaMinor);
    if (!retry) {
      await storage.putCatalogView(view);
      return;
    }
    if (retry.view.catalogVersion === view.catalogVersion) {
      return;
    }
    if (retry.seqNo === undefined || retry.primaryTerm === undefined) {
      return;
    }
    await storage.putCatalogViewCas(view, retry.seqNo, retry.primaryTerm);
  }

  private registerSnapshot(snapshot: CatalogSnapshot): void {
    const skipped: DeclarativeCatalogSkippedEntry[] = [...snapshot.skipped];
    const deps = this.deps;

    for (const asset of snapshot.assets) {
      try {
        const spec = loadDeclarativeConnectorSpec(asset);
        const id = spec.metadata.id;
        if (this.registeredTypeIds.includes(id)) {
          continue;
        }
        if (deps?.isTypeRegistered(id)) {
          skipped.push({
            id,
            version: identityFromYaml(asset.yaml).version,
            reason: 'already_registered',
          });
          continue;
        }
        deps?.registerSpec(spec);
        this.registeredTypeIds.push(id);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        skipped.push({
          ...identityFromYaml(asset.yaml),
          reason: 'load_failed',
          detail,
        });
      }
    }

    this.snapshot = { ...snapshot, skipped };
  }

  private recordError(error: unknown): void {
    this.lastError = {
      message: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString(),
    };
  }
}

const identityFromYaml = (yaml: string): { id: string; version?: string } => {
  try {
    const parsed = parseDeclarativeConnectorSpec(yaml);
    return { id: parsed.id, version: parsed.version };
  } catch {
    return { id: 'unknown' };
  }
};

const tryParseAsset = (
  asset: RawConnectorSpecAsset
): { id: string; version: string; contentHash: string } | undefined => {
  try {
    const parsed = parseDeclarativeConnectorSpec(asset.yaml);
    return {
      id: parsed.id,
      version: parsed.version,
      contentHash: getContentHash(asset.yaml),
    };
  } catch {
    return undefined;
  }
};
