/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { getContentHash, toIconDataUrl, validateSvgIcon } from './content_hash';
import { assertDefinitionYamlHash } from './definition_integrity';
import type { CatalogLogOnce } from './log_once';
import { parseCatalogManifest } from './parse_manifest';
import { compareSpecVersions } from './spec_version_format';
import { verifyCatalogSignature } from './signature';
import type {
  CatalogRegistryDeps,
  CatalogTypeBuilder,
  LoadCatalogFromIndexResult,
  RegisteredCatalogType,
} from './types';

const RUNTIME_NOTICE = 'runtime_unavailable';

export interface LoadCatalogFromIndexDeps {
  storage: ConnectorCatalogStorage;
  publicKeys: readonly string[];
  registry: CatalogRegistryDeps;
  buildType?: CatalogTypeBuilder;
  registered: Map<string, RegisteredCatalogType>;
  logger: Logger;
  logOnce: CatalogLogOnce;
  notices?: Set<string>;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Picks the highest MAJOR.MINOR stored for each connector id. */
export const selectLatestPerId = (
  rows: Array<{ id: string; version: string; contentHash: string }>
): Map<string, { version: string; contentHash: string }> => {
  const latest = new Map<string, { version: string; contentHash: string }>();
  for (const row of rows) {
    const current = latest.get(row.id);
    if (!current || compareSpecVersions(row.version, current.version) > 0) {
      latest.set(row.id, { version: row.version, contentHash: row.contentHash });
    }
  }
  return latest;
};

/** Re-verifies the stored manifest and registers the latest definition per id. */
export const loadCatalogFromIndex = async ({
  storage,
  publicKeys,
  registry,
  buildType,
  registered,
  logger,
  logOnce,
  notices,
}: LoadCatalogFromIndexDeps): Promise<LoadCatalogFromIndexResult> => {
  const stored = await storage.getManifest();
  if (!stored) {
    return { registered: 0, manifestPresent: false, definitions: 0 };
  }
  if (!verifyCatalogSignature(stored.bytes, stored.signature, publicKeys)) {
    logOnce.error(
      stored.catalogVersion,
      'signature',
      'Stored connector catalog signature verification failed; serving no catalog types'
    );
    return { registered: 0, manifestPresent: true, definitions: 0 };
  }

  let manifest;
  try {
    manifest = parseCatalogManifest(JSON.parse(stored.bytes), logOnce);
  } catch (error) {
    logOnce.error(
      stored.catalogVersion,
      'parse',
      `Stored connector catalog manifest is invalid: ${errorMessage(error)}`
    );
    return { registered: 0, manifestPresent: true, definitions: 0 };
  }

  const latest = selectLatestPerId(await storage.listDefinitions());
  const assets = await storage.getAssets(
    [...latest.keys()]
      .map((id) => manifest.typeMetadata[id]?.icon?.contentHash)
      .filter((hash): hash is string => hash !== undefined)
  );

  let registeredCount = 0;
  let considered = 0;
  for (const [id, selected] of latest) {
    const metadata = manifest.typeMetadata[id];
    if (!metadata) {
      logOnce.warn(
        manifest.catalogVersion,
        `metadata:${id}`,
        `Skipping connector "${id}": type metadata is missing from the signed manifest`
      );
      continue;
    }
    considered += 1;
    const current = registered.get(id);
    if (
      current &&
      current.version === selected.version &&
      current.contentHash === selected.contentHash
    ) {
      logger.debug(`Catalog connector "${id}@${selected.version}" is already registered`);
      continue;
    }
    if (registry.isTypeRegistered(id) && !registered.has(id)) {
      logOnce.warn(
        manifest.catalogVersion,
        `collision:${id}`,
        `Skipping catalog connector "${id}" because an in-tree type is already registered`
      );
      continue;
    }
    if (registry.isTypeRegistered(id)) {
      logger.debug(
        `Catalog connector "${id}" is already registered; leaving ${
          current?.version ?? 'the current type'
        } in place`
      );
      continue;
    }

    const definition = await storage.getDefinition(id, selected.version);
    if (!definition) {
      logOnce.warn(
        manifest.catalogVersion,
        `missing:${id}@${selected.version}`,
        `Skipping connector "${id}@${selected.version}": definition is not stored`
      );
      continue;
    }
    try {
      assertDefinitionYamlHash(definition, manifest.connectors);
    } catch (error) {
      logOnce.error(manifest.catalogVersion, `hash:${id}@${selected.version}`, errorMessage(error));
      continue;
    }
    if (!buildType) {
      continue;
    }

    const icon = metadata.icon ? assets.get(metadata.icon.contentHash) : undefined;
    let iconDataUrl: string | undefined;
    if (icon) {
      try {
        if (getContentHash(icon.svg) !== icon.contentHash) {
          throw new Error('stored icon hash does not match its document');
        }
        validateSvgIcon(icon.svg);
        iconDataUrl = toIconDataUrl(icon.svg);
      } catch (error) {
        logOnce.warn(
          manifest.catalogVersion,
          `icon:${id}`,
          `Skipping icon for "${id}": ${errorMessage(error)}`
        );
      }
    }

    try {
      const actionType = buildType({
        id,
        version: selected.version,
        yaml: definition.yaml,
        metadata,
        iconDataUrl,
      });
      registry.registerType(actionType);
      registered.set(id, {
        id,
        version: selected.version,
        contentHash: selected.contentHash,
      });
      registeredCount += 1;
      logger.info(`Registered catalog connector "${id}@${selected.version}"`);
    } catch (error) {
      logOnce.error(
        manifest.catalogVersion,
        `register:${id}`,
        `Failed to register catalog connector "${id}@${selected.version}": ${errorMessage(error)}`
      );
    }
  }

  if (!buildType && considered > 0 && !notices?.has(RUNTIME_NOTICE)) {
    logger.info(
      `declarative runtime not available; ${considered} definitions stored, 0 registered`
    );
    notices?.add(RUNTIME_NOTICE);
  }

  return {
    registered: registeredCount,
    manifestPresent: true,
    definitions: considered,
  };
};
