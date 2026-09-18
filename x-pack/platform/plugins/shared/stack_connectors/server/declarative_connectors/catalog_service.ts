/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CatalogActionType } from '@kbn/actions-plugin/server';
import type {
  DeclarativeCatalogHealth,
  DeclarativeCatalogIncompatibleVersion,
  DeclarativeCatalogPinnedVersionMissing,
  DeclarativeCatalogRegisteredVersions,
  DeclarativeCatalogSkippedEntry,
  DeclarativeCatalogVersionEntry,
} from './types';
import type {
  CatalogSnapshot,
  CatalogSnapshotAsset,
  CatalogSpecSource,
} from './catalog_spec_source';
import { versionKey } from './catalog_spec_source';
import type {
  ConnectorCatalogStorage,
  StoredCatalogRow,
  StoredCatalogRowStatus,
  StoredCatalogView,
} from './catalog_storage';
import { createConnectorCatalogStorage, definitionDocId, rowStatus } from './catalog_storage';
import type { CatalogBootResult, VersionedTypeFactory } from './catalog_spec_provider';
import { activeVersionsFromView } from './catalog_spec_provider';
import { checkAdditiveCompatibility } from './compatibility';
import type { MaterializedSpec } from './load_declarative_specs';
import { materializeDeclarativeAsset } from './load_declarative_specs';
import type { PinnedVersionsClient } from './pinned_versions';
import { findPinnedSpecVersions } from './pinned_versions';
import type { VersionedConnectorType } from './versioned_connector_type';

export interface DeclarativeCatalogServiceOptions {
  source: CatalogSpecSource;
  registryUrl: string;
  refreshIntervalMs: number;
  kibanaMinor: string;
  logger: Logger;
  buildType: VersionedTypeFactory;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
  /** Called whenever the storage becomes available so lazy loaders can read the index. */
  onStorageReady?: (storage: ConnectorCatalogStorage) => void;
}

export interface DeclarativeCatalogRegistrationDeps {
  registerType: (actionType: CatalogActionType) => void;
  isTypeRegistered: (actionTypeId: string) => boolean;
  esClient: ElasticsearchClient;
  /** Internal repository over `action` saved objects; enables pinned-version health checks. */
  savedObjectsRepository?: PinnedVersionsClient;
}

const MIN_INDEX_POLL_MS = 5 * 60 * 1000;

export const indexPollIntervalMs = (refreshIntervalMs: number): number =>
  Math.max(refreshIntervalMs * 5, MIN_INDEX_POLL_MS);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Persists catalog snapshots, registers new spec ids, adds versions to existing ids, and keeps
 * this node's type list in sync with the index.
 */
export class DeclarativeCatalogService {
  private snapshot?: CatalogSnapshot;
  private refreshing?: Promise<void>;
  private lastRefreshAt?: string;
  private lastError?: { message: string; at: string };
  private deps?: DeclarativeCatalogRegistrationDeps;
  private storage?: ConnectorCatalogStorage;
  private readonly types = new Map<string, VersionedConnectorType>();
  private readonly incompatible = new Map<string, DeclarativeCatalogIncompatibleVersion>();
  private pinnedVersionsMissing: DeclarativeCatalogPinnedVersionMissing[] = [];
  private indexReady = false;
  private indexCatalogVersion?: string;
  private indexPoll?: ReturnType<typeof setInterval>;
  private readonly createStorage: (
    esClient: ElasticsearchClient,
    logger: Logger
  ) => ConnectorCatalogStorage;

  constructor(private readonly options: DeclarativeCatalogServiceOptions) {
    this.createStorage = options.createStorage ?? createConnectorCatalogStorage;
  }

  public async start(deps: DeclarativeCatalogRegistrationDeps): Promise<void> {
    this.deps = deps;
    this.setStorage(this.createStorage(deps.esClient, this.options.logger));
    const pollMs = indexPollIntervalMs(this.options.refreshIntervalMs);
    this.indexPoll = setInterval(() => {
      void this.syncFromIndex();
    }, pollMs);
    this.indexPoll.unref?.();
  }

  public stop(): void {
    if (this.indexPoll) {
      clearInterval(this.indexPoll);
      this.indexPoll = undefined;
    }
  }

  /** Records what the boot provider registered through the actions plugin. */
  public recordIndexBoot({ types, view, pinnedVersionsMissing, storage }: CatalogBootResult): void {
    for (const type of types) {
      this.types.set(type.id, type);
    }
    this.pinnedVersionsMissing = pinnedVersionsMissing;
    if (storage) {
      this.setStorage(storage);
    }
    if (!view) {
      return;
    }
    this.indexReady = true;
    this.indexCatalogVersion = view.catalogVersion;
    this.snapshot = {
      catalogVersion: view.catalogVersion,
      activeVersions: Object.fromEntries(activeVersionsFromView(view)),
      versions: view.rows.map((row) => ({
        id: row.id,
        version: row.version,
        status: rowStatus(row),
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

  /**
   * Reads the index view and registers versions other nodes stored, without a registry fetch.
   * Keeps the type list of this node consistent with the cluster.
   */
  public syncFromIndex = async (): Promise<void> => {
    const storage = this.storage;
    if (!storage) {
      return;
    }
    try {
      const existing = await storage.getCatalogView(this.options.kibanaMinor);
      if (!existing) {
        return;
      }
      const { view } = existing;
      this.indexReady = true;
      this.indexCatalogVersion = view.catalogVersion;
      const activeVersions = activeVersionsFromView(view);
      const missing = [...activeVersions].filter(([id, version]) => {
        const type = this.types.get(id);
        return !type || !type.hasVersion(version);
      });
      if (missing.length > 0) {
        const definitions = await storage.getDefinitions(
          missing.map(([id, version]) => ({ id, version }))
        );
        for (const [id, version] of missing) {
          const definition = definitions.get(definitionDocId(id, version));
          if (!definition) {
            continue;
          }
          this.materializeAndActivate(
            () =>
              materializeDeclarativeAsset({
                yamlPath: definitionDocId(id, version),
                yaml: definition.yaml,
                icon: definition.iconSvg,
              }),
            id,
            version
          );
        }
      }
      for (const [id, version] of activeVersions) {
        const type = this.types.get(id);
        if (type && type.hasVersion(version) && type.getActiveVersion() !== version) {
          type.setActiveVersion(version);
        }
      }
    } catch (error) {
      this.options.logger.warn(`Connector catalog index poll failed: ${errorMessage(error)}`);
    }
  };

  public getHealth(): DeclarativeCatalogHealth {
    const registeredVersionsByType: Record<string, DeclarativeCatalogRegisteredVersions> = {};
    for (const [id, type] of this.types) {
      registeredVersionsByType[id] = {
        activeVersion: type.getActiveVersion(),
        versions: type.getVersions(),
      };
    }
    return {
      enabled: true,
      ready: this.types.size > 0 || this.indexReady,
      sourceUrl: this.options.registryUrl,
      activeCatalogVersion: this.snapshot?.catalogVersion,
      versions: this.snapshot?.versions ?? [],
      registeredTypeIds: [...this.types.keys()],
      registeredVersionsByType,
      incompatibleVersions: [...this.incompatible.values()],
      pinnedVersionsMissing: [...this.pinnedVersionsMissing],
      skipped: this.snapshot?.skipped ?? [],
      lastRefreshAt: this.lastRefreshAt,
      lastError: this.lastError,
      indexReady: this.indexReady,
      indexCatalogVersion: this.indexCatalogVersion,
    };
  }

  private setStorage(storage: ConnectorCatalogStorage): void {
    this.storage = storage;
    this.options.onStorageReady?.(storage);
  }

  private async runRefreshFromRegistry(): Promise<void> {
    try {
      const existing = await this.storage?.getCatalogView(this.options.kibanaMinor);
      const storedHashes = new Map(
        (existing?.view.rows ?? []).map((row) => [versionKey(row.id, row.version), row.contentHash])
      );
      const snapshot = await this.options.source.loadSnapshot({ storedHashes });
      const skipped = await this.registerSnapshot(snapshot, existing?.view);
      await this.persistSnapshot(snapshot, existing, skipped);
      await this.refreshPinnedVersionsMissing(snapshot);
      this.lastRefreshAt = new Date().toISOString();
      this.lastError = undefined;
    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Registers new ids, adds fetched versions to known ids, and moves the active version when
   * the manifest changed it and the new version is additive. Returns the load failures.
   */
  private async registerSnapshot(
    snapshot: CatalogSnapshot,
    previousView: StoredCatalogView | undefined
  ): Promise<DeclarativeCatalogSkippedEntry[]> {
    const skipped: DeclarativeCatalogSkippedEntry[] = [...snapshot.skipped];
    const assetsByKey = new Map(
      snapshot.assets.map((asset) => [versionKey(asset.id, asset.version), asset])
    );
    const previousActive = previousView ? activeVersionsFromView(previousView) : new Map();

    for (const [id, activeVersion] of Object.entries(snapshot.activeVersions)) {
      const asset = assetsByKey.get(versionKey(id, activeVersion));
      const type = this.types.get(id);

      if (!type) {
        if (this.deps?.isTypeRegistered(id)) {
          skipped.push({ id, version: activeVersion, reason: 'already_registered' });
          continue;
        }
        const materialized = await this.materializeVersion(id, activeVersion, asset, skipped);
        if (!materialized) {
          continue;
        }
        this.registerNewType(id, materialized, skipped);
        continue;
      }

      if (type.getActiveVersion() === activeVersion) {
        continue;
      }
      const materialized = await this.materializeVersion(id, activeVersion, asset, skipped);
      if (!materialized) {
        continue;
      }
      this.activateIfCompatible(type, materialized, previousActive.get(id));
    }

    return skipped;
  }

  private registerNewType(
    id: string,
    materialized: MaterializedSpec,
    skipped: DeclarativeCatalogSkippedEntry[]
  ): void {
    try {
      const type = this.options.buildType({
        id,
        versions: [materialized],
        activeVersion: materialized.version,
      });
      this.deps?.registerType(type.actionType);
      this.types.set(id, type);
    } catch (error) {
      skipped.push({
        id,
        version: materialized.version,
        reason: 'load_failed',
        detail: errorMessage(error),
      });
    }
  }

  private activateIfCompatible(
    type: VersionedConnectorType,
    candidate: MaterializedSpec,
    previousActiveVersion: string | undefined
  ): void {
    const current =
      type.getMaterialized(type.getActiveVersion()) ??
      (previousActiveVersion ? type.getMaterialized(previousActiveVersion) : undefined);
    const compatibility = current
      ? checkAdditiveCompatibility(current.declarative, candidate.declarative)
      : { compatible: true, reasons: [] };
    if (!compatibility.compatible) {
      this.incompatible.set(versionKey(type.id, candidate.version), {
        id: type.id,
        version: candidate.version,
        activeVersion: type.getActiveVersion(),
        reasons: compatibility.reasons,
      });
      this.options.logger.warn(
        `Connector catalog activated "${type.id}@${
          candidate.version
        }" but it is not additive over "${type.getActiveVersion()}"; keeping the previous version active (${compatibility.reasons.join(
          ', '
        )})`
      );
      return;
    }
    this.incompatible.delete(versionKey(type.id, candidate.version));
    type.addVersion(candidate);
    type.setActiveVersion(candidate.version);
  }

  private materializeAndActivate(
    materialize: () => MaterializedSpec,
    id: string,
    version: string
  ): void {
    try {
      const materialized = materialize();
      const type = this.types.get(id);
      if (!type) {
        if (this.deps?.isTypeRegistered(id)) {
          return;
        }
        this.registerNewType(id, materialized, []);
        return;
      }
      this.activateIfCompatible(type, materialized, undefined);
    } catch (error) {
      this.options.logger.warn(
        `Skipping connector catalog definition ${definitionDocId(id, version)}: ${errorMessage(
          error
        )}`
      );
    }
  }

  /** Materializes from the fetched asset, or from the index when the hash was already stored. */
  private async materializeVersion(
    id: string,
    version: string,
    asset: CatalogSnapshotAsset | undefined,
    skipped: DeclarativeCatalogSkippedEntry[]
  ): Promise<MaterializedSpec | undefined> {
    try {
      if (asset) {
        return materializeDeclarativeAsset(asset);
      }
      const definition = await this.storage?.getDefinition(id, version);
      if (!definition) {
        skipped.push({
          id,
          version,
          reason: 'load_failed',
          detail: 'definition missing from index after hash match',
        });
        return undefined;
      }
      return materializeDeclarativeAsset({
        yamlPath: definitionDocId(id, version),
        yaml: definition.yaml,
        icon: definition.iconSvg,
      });
    } catch (error) {
      skipped.push({ id, version, reason: 'load_failed', detail: errorMessage(error) });
      return undefined;
    }
  }

  private async persistSnapshot(
    snapshot: CatalogSnapshot,
    existing: Awaited<ReturnType<ConnectorCatalogStorage['getCatalogView']>>,
    skipped: DeclarativeCatalogSkippedEntry[]
  ): Promise<void> {
    const storage = this.storage;
    if (!storage) {
      return;
    }
    const storedRows = new Map(
      (existing?.view.rows ?? []).map((row) => [versionKey(row.id, row.version), row])
    );
    const failed = new Set(
      skipped
        .filter((entry) => entry.reason === 'load_failed' && entry.version !== undefined)
        .map((entry) => versionKey(entry.id, entry.version as string))
    );
    const rows: StoredCatalogRow[] = [];

    for (const asset of snapshot.assets) {
      await storage.putDefinitionCreate({
        id: asset.id,
        version: asset.version,
        yaml: asset.yaml,
        iconSvg: asset.icon,
        contentHash: asset.contentHash,
        addedAt: new Date().toISOString(),
      });
    }

    for (const entry of snapshot.versions) {
      const key = versionKey(entry.id, entry.version);
      const asset = snapshot.assets.find(
        (candidate) => candidate.id === entry.id && candidate.version === entry.version
      );
      const stored = storedRows.get(key);
      const contentHash = asset?.contentHash ?? stored?.contentHash;
      if (!contentHash || failed.has(key)) {
        continue;
      }
      rows.push({
        id: entry.id,
        version: entry.version,
        contentHash,
        definitionId: definitionDocId(entry.id, entry.version),
        status: this.rowStatusFor(entry),
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
    this.snapshot = {
      ...snapshot,
      versions: snapshot.versions.map((entry) => ({ ...entry, status: this.rowStatusFor(entry) })),
      skipped,
    };
  }

  /** The view keeps the previous version active when the manifest's choice is not additive. */
  private rowStatusFor(entry: DeclarativeCatalogVersionEntry): StoredCatalogRowStatus {
    if (this.incompatible.has(versionKey(entry.id, entry.version))) {
      return 'incompatible';
    }
    const type = this.types.get(entry.id);
    if (type && entry.status === 'published' && type.getActiveVersion() === entry.version) {
      return 'active';
    }
    if (type && entry.status === 'active' && type.getActiveVersion() !== entry.version) {
      return 'published';
    }
    return entry.status;
  }

  private async refreshPinnedVersionsMissing(snapshot: CatalogSnapshot): Promise<void> {
    const repository = this.deps?.savedObjectsRepository;
    if (!repository) {
      return;
    }
    const pinned = await findPinnedSpecVersions(repository, this.options.logger);
    const listed = new Set(snapshot.versions.map((entry) => versionKey(entry.id, entry.version)));
    const missing: DeclarativeCatalogPinnedVersionMissing[] = [];
    for (const [id, versions] of pinned) {
      for (const version of versions) {
        if (listed.has(versionKey(id, version))) {
          continue;
        }
        const type = this.types.get(id);
        if (type?.hasVersion(version)) {
          continue;
        }
        const stored = await this.storage?.getDefinition(id, version);
        if (!stored) {
          missing.push({ id, version });
        }
      }
    }
    this.pinnedVersionsMissing = missing;
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
    if (viewsEqual(existing.view, view)) {
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
    if (viewsEqual(retry.view, view)) {
      return;
    }
    if (retry.seqNo === undefined || retry.primaryTerm === undefined) {
      return;
    }
    await storage.putCatalogViewCas(view, retry.seqNo, retry.primaryTerm);
  }

  private recordError(error: unknown): void {
    this.lastError = {
      message: errorMessage(error),
      at: new Date().toISOString(),
    };
  }
}

const rowKey = (row: StoredCatalogRow): string =>
  `${row.id}@${row.version}:${row.contentHash}:${rowStatus(row)}`;

/** Same catalog version and same rows (id, version, hash, status) means nothing to write. */
const viewsEqual = (left: StoredCatalogView, right: StoredCatalogView): boolean =>
  left.catalogVersion === right.catalogVersion &&
  left.rows.length === right.rows.length &&
  left.rows.map(rowKey).sort().join('\n') === right.rows.map(rowKey).sort().join('\n');
