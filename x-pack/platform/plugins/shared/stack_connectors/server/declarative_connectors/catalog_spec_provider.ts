/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CatalogActionType, CatalogSpecProvider } from '@kbn/actions-plugin/server';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import { createConnectorCatalogStorage, definitionDocId, rowStatus } from './catalog_storage';
import { DiskSnapshotSource } from './disk_snapshot_source';
import { getContentHash } from './icon';
import type { MaterializedSpec } from './load_declarative_specs';
import { materializeDeclarativeAsset } from './load_declarative_specs';
import { parseDeclarativeConnectorSpec } from './parse_spec';
import type { PinnedSpecVersions, PinnedVersionsClient } from './pinned_versions';
import { findPinnedSpecVersions } from './pinned_versions';
import type { RawConnectorSpecAsset } from './spec_source';
import type { DeclarativeCatalogManifest, DeclarativeCatalogPinnedVersionMissing } from './types';
import type { VersionedConnectorType } from './versioned_connector_type';

export const toKibanaMinor = (version: string): string => {
  const [major, minor] = version.split('.');
  return minor === undefined ? major : `${major}.${minor}`;
};

export interface CatalogSpecProviderDiskSource {
  loadRawSpecs(): Promise<RawConnectorSpecAsset[]>;
  loadManifest(): Promise<DeclarativeCatalogManifest>;
}

/** Builds the single registry entry for one connector id from its materialized versions. */
export type VersionedTypeFactory = (options: {
  id: string;
  versions: MaterializedSpec[];
  activeVersion: string;
}) => VersionedConnectorType;

export interface CatalogBootResult {
  types: VersionedConnectorType[];
  view?: StoredCatalogView;
  pinnedVersionsMissing: DeclarativeCatalogPinnedVersionMissing[];
  storage?: ConnectorCatalogStorage;
}

export interface CatalogSpecProviderOptions {
  logger: Logger;
  kibanaMinor: string;
  buildType: VersionedTypeFactory;
  diskSource?: CatalogSpecProviderDiskSource;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
  onBoot?: (result: CatalogBootResult) => void;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createCatalogSpecProvider = (
  options: CatalogSpecProviderOptions
): CatalogSpecProvider => ({
  load: async ({ esClient, savedObjectsRepository }) =>
    loadCatalogTypes({ ...options, esClient, savedObjectsRepository }),
});

const loadCatalogTypes = async ({
  esClient,
  savedObjectsRepository,
  logger,
  kibanaMinor,
  buildType,
  diskSource,
  createStorage = createConnectorCatalogStorage,
  onBoot,
}: CatalogSpecProviderOptions & {
  esClient: ElasticsearchClient;
  savedObjectsRepository: PinnedVersionsClient;
}): Promise<CatalogActionType[]> => {
  try {
    const storage = createStorage(esClient, logger);
    const existing = await storage.getCatalogView(kibanaMinor);
    const view = existing
      ? existing.view
      : await seedFromDisk({ storage, logger, kibanaMinor, diskSource });
    if (!view) {
      onBoot?.({ types: [], pinnedVersionsMissing: [], storage });
      return [];
    }
    const pinned = await findPinnedSpecVersions(savedObjectsRepository, logger);
    const { types, pinnedVersionsMissing } = await materializeFromIndex({
      storage,
      view,
      pinned,
      buildType,
      logger,
    });
    onBoot?.({ types, view, pinnedVersionsMissing, storage });
    return types.map((type) => type.actionType);
  } catch (error) {
    logger.error(`Failed to load connector catalog specs from index: ${errorMessage(error)}`);
    onBoot?.({ types: [], pinnedVersionsMissing: [] });
    return [];
  }
};

const seedFromDisk = async ({
  storage,
  logger,
  kibanaMinor,
  diskSource,
}: {
  storage: ConnectorCatalogStorage;
  logger: Logger;
  kibanaMinor: string;
  diskSource?: CatalogSpecProviderDiskSource;
}): Promise<StoredCatalogView | undefined> => {
  const source = diskSource ?? new DiskSnapshotSource();
  let assets: RawConnectorSpecAsset[];
  let manifest: DeclarativeCatalogManifest;
  try {
    assets = await source.loadRawSpecs();
    manifest = await source.loadManifest();
  } catch (error) {
    logger.error(`Failed to seed connector catalog from disk snapshot: ${errorMessage(error)}`);
    return undefined;
  }

  const addedAt = new Date().toISOString();
  const rows: StoredCatalogView['rows'] = [];

  for (const asset of assets) {
    try {
      const parsed = parseDeclarativeConnectorSpec(asset.yaml);
      const contentHash = getContentHash(asset.yaml);
      await storage.putDefinitionCreate({
        id: parsed.id,
        version: parsed.version,
        yaml: asset.yaml,
        iconSvg: asset.icon,
        contentHash,
        addedAt,
      });
      rows.push({
        id: parsed.id,
        version: parsed.version,
        contentHash,
        definitionId: definitionDocId(parsed.id, parsed.version),
        status: manifest.activeVersions[parsed.id] === parsed.version ? 'active' : 'published',
      });
    } catch (error) {
      logger.warn(`Failed to seed connector catalog definition from disk: ${errorMessage(error)}`);
    }
  }

  const view: StoredCatalogView = {
    catalogVersion: manifest.catalogVersion,
    fetchedAt: addedAt,
    kibanaMinor,
    rows,
  };
  await storage.putCatalogView(view);
  return view;
};

/** Active version per id from the stored view. */
export const activeVersionsFromView = (view: StoredCatalogView): Map<string, string> => {
  const active = new Map<string, string>();
  for (const row of view.rows) {
    if (rowStatus(row) === 'active') {
      active.set(row.id, row.version);
    }
  }
  return active;
};

/**
 * Materializes, in one bulk read, the active version of every id in the view plus every
 * version a saved connector is pinned to. Builds one versioned type per id.
 */
export const materializeFromIndex = async ({
  storage,
  view,
  pinned,
  buildType,
  logger,
}: {
  storage: ConnectorCatalogStorage;
  view: StoredCatalogView;
  pinned: PinnedSpecVersions;
  buildType: VersionedTypeFactory;
  logger: Logger;
}): Promise<{
  types: VersionedConnectorType[];
  pinnedVersionsMissing: DeclarativeCatalogPinnedVersionMissing[];
}> => {
  const activeVersions = activeVersionsFromView(view);
  const wanted = new Map<string, Set<string>>();
  for (const [id, version] of activeVersions) {
    wanted.set(id, new Set([version]));
  }
  for (const [id, versions] of pinned) {
    if (!activeVersions.has(id)) {
      // Pinned to a type the catalog no longer lists: nothing to register, but report it.
      continue;
    }
    for (const version of versions) {
      wanted.get(id)?.add(version);
    }
  }

  const keys = [...wanted].flatMap(([id, versions]) =>
    [...versions].map((version) => ({ id, version }))
  );
  const definitions = await storage.getDefinitions(keys);
  const pinnedVersionsMissing: DeclarativeCatalogPinnedVersionMissing[] = [];
  const types: VersionedConnectorType[] = [];

  for (const [id, versions] of wanted) {
    const materialized: MaterializedSpec[] = [];
    for (const version of versions) {
      const definition = definitions.get(definitionDocId(id, version));
      if (!definition) {
        logger.warn(`Connector catalog definition ${definitionDocId(id, version)} is missing`);
        if (pinned.get(id)?.has(version)) {
          pinnedVersionsMissing.push({ id, version });
        }
        continue;
      }
      try {
        materialized.push(
          materializeDeclarativeAsset({
            yamlPath: definitionDocId(id, version),
            yaml: definition.yaml,
            icon: definition.iconSvg,
          })
        );
      } catch (error) {
        logger.warn(
          `Skipping connector catalog definition ${definitionDocId(id, version)}: ${errorMessage(
            error
          )}`
        );
      }
    }
    const activeVersion = activeVersions.get(id);
    if (
      activeVersion === undefined ||
      !materialized.some((entry) => entry.version === activeVersion)
    ) {
      logger.warn(`Skipping connector type ${id}: active version is not materializable`);
      continue;
    }
    try {
      types.push(buildType({ id, versions: materialized, activeVersion }));
    } catch (error) {
      logger.warn(`Skipping connector type ${id}: ${errorMessage(error)}`);
    }
  }

  for (const [id, versions] of pinned) {
    if (!activeVersions.has(id)) {
      for (const version of versions) {
        pinnedVersionsMissing.push({ id, version });
      }
    }
  }

  return { types, pinnedVersionsMissing };
};
