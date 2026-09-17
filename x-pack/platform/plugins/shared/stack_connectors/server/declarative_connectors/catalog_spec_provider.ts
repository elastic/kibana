/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CatalogSpecProvider } from '@kbn/actions-plugin/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import { createConnectorCatalogStorage, definitionDocId } from './catalog_storage';
import { DiskSnapshotSource } from './disk_snapshot_source';
import { getContentHash } from './icon';
import { loadDeclarativeConnectorSpec } from './load_declarative_specs';
import { parseDeclarativeConnectorSpec } from './parse_spec';
import type { RawConnectorSpecAsset } from './spec_source';
import type { DeclarativeCatalogManifest } from './types';

export const toKibanaMinor = (version: string): string => {
  const [major, minor] = version.split('.');
  return minor === undefined ? major : `${major}.${minor}`;
};

export interface CatalogSpecProviderDiskSource {
  loadRawSpecs(): Promise<RawConnectorSpecAsset[]>;
  loadManifest(): Promise<DeclarativeCatalogManifest>;
}

export interface CatalogSpecProviderOptions {
  logger: Logger;
  kibanaMinor: string;
  diskSource?: CatalogSpecProviderDiskSource;
  createStorage?: (esClient: ElasticsearchClient, logger: Logger) => ConnectorCatalogStorage;
  onBoot?: (result: { specs: ConnectorSpec[]; view?: StoredCatalogView }) => void;
}

export const createCatalogSpecProvider = (
  options: CatalogSpecProviderOptions
): CatalogSpecProvider => ({
  load: async ({ esClient }) => loadCatalogSpecs({ ...options, esClient }),
});

const loadCatalogSpecs = async ({
  esClient,
  logger,
  kibanaMinor,
  diskSource,
  createStorage = createConnectorCatalogStorage,
  onBoot,
}: CatalogSpecProviderOptions & { esClient: ElasticsearchClient }): Promise<ConnectorSpec[]> => {
  try {
    const storage = createStorage(esClient, logger);
    const existing = await storage.getCatalogView(kibanaMinor);
    if (!existing) {
      return await seedFromDisk({ storage, logger, kibanaMinor, diskSource, onBoot });
    }
    const specs = await materializeFromView(storage, existing.view, logger);
    onBoot?.({ specs, view: existing.view });
    return specs;
  } catch (error) {
    logger.error(
      `Failed to load connector catalog specs from index: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    onBoot?.({ specs: [] });
    return [];
  }
};

const seedFromDisk = async ({
  storage,
  logger,
  kibanaMinor,
  diskSource,
  onBoot,
}: {
  storage: ConnectorCatalogStorage;
  logger: Logger;
  kibanaMinor: string;
  diskSource?: CatalogSpecProviderDiskSource;
  onBoot?: CatalogSpecProviderOptions['onBoot'];
}): Promise<ConnectorSpec[]> => {
  const source = diskSource ?? new DiskSnapshotSource();
  let assets: RawConnectorSpecAsset[];
  let manifest: DeclarativeCatalogManifest;
  try {
    assets = await source.loadRawSpecs();
    manifest = await source.loadManifest();
  } catch (error) {
    logger.error(
      `Failed to seed connector catalog from disk snapshot: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    onBoot?.({ specs: [] });
    return [];
  }

  const addedAt = new Date().toISOString();
  const rows: StoredCatalogView['rows'] = [];
  const specs: ConnectorSpec[] = [];

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
      specs.push(loadDeclarativeConnectorSpec(asset));
      rows.push({
        id: parsed.id,
        version: parsed.version,
        contentHash,
        definitionId: definitionDocId(parsed.id, parsed.version),
      });
    } catch (error) {
      logger.warn(
        `Failed to seed connector catalog definition from disk: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const view: StoredCatalogView = {
    catalogVersion: manifest.catalogVersion,
    fetchedAt: addedAt,
    kibanaMinor,
    rows,
  };
  await storage.putCatalogView(view);
  onBoot?.({ specs, view });
  return specs;
};

const materializeFromView = async (
  storage: ConnectorCatalogStorage,
  view: StoredCatalogView,
  logger: Logger
): Promise<ConnectorSpec[]> => {
  const specs: ConnectorSpec[] = [];
  for (const row of view.rows) {
    const definition = await storage.getDefinition(row.id, row.version);
    if (!definition) {
      logger.warn(
        `Skipping connector catalog row ${row.definitionId}: definition document is missing`
      );
      continue;
    }
    try {
      specs.push(
        loadDeclarativeConnectorSpec({
          yamlPath: row.definitionId,
          yaml: definition.yaml,
          icon: definition.iconSvg,
        })
      );
    } catch (error) {
      logger.warn(
        `Skipping connector catalog row ${row.definitionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return specs;
};
