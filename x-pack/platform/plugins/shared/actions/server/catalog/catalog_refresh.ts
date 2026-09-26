/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { definitionDocId } from './catalog_storage';
import { getContentHash, toIconDataUrl, validateSvgIcon } from './icon';
import type { CatalogLogOnce } from './log_once';
import { parseCatalogManifest } from './parse_manifest';
import { MAX_ICON_BYTES, MAX_SPEC_BYTES, mapWithConcurrency } from './remote_catalog_source';
import { verifyCatalogSignature } from './signature';
import { buildVersion } from './build_version';
import type { CatalogManifestRow, CatalogSource } from './types';

const RESERVED_PREFIX = '.declarative-';
const DEFAULT_FETCH_CONCURRENCY = 5;

export interface RunCatalogRefreshDeps {
  source: CatalogSource;
  storage: ConnectorCatalogStorage;
  publicKeys: readonly string[];
  logger: Logger;
  logOnce: CatalogLogOnce;
  reload: () => Promise<void>;
  fetchConcurrency?: number;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Fetches, verifies, stores, and reloads the connector catalog (doc 7.4). */
export const runCatalogRefresh = async ({
  source,
  storage,
  publicKeys,
  logger,
  logOnce,
  reload,
  fetchConcurrency = DEFAULT_FETCH_CONCURRENCY,
}: RunCatalogRefreshDeps): Promise<void> => {
  let fetched: { bytes: string; signature: string };
  try {
    fetched = await source.readManifest();
  } catch (error) {
    logOnce.warnThenDebug(
      'fetch_manifest',
      `Failed to fetch the connector catalog from ${source.origin}: ${errorMessage(error)}`
    );
    return;
  }

  const stored = await storage.getManifest();
  const fetchedHash = getContentHash(fetched.bytes);

  if (stored && getContentHash(stored.bytes) === fetchedHash) {
    let parsedForExistence;
    try {
      parsedForExistence = parseCatalogManifest(JSON.parse(stored.bytes), logger);
    } catch (error) {
      logOnce.error(
        stored.catalogVersion,
        'parse',
        `Stored connector catalog manifest is invalid: ${errorMessage(error)}`
      );
      return;
    }
    const existing = await storage.existsDefinitions(parsedForExistence.connectors);
    const missing = parsedForExistence.connectors.filter(
      (row) => !existing.has(definitionDocId(row.id, row.version))
    );
    if (missing.length === 0) {
      return;
    }
  }

  if (!verifyCatalogSignature(fetched.bytes, fetched.signature, publicKeys)) {
    logOnce.error(
      stored?.catalogVersion ?? 'unsigned',
      'signature',
      'Connector catalog signature verification failed; leaving the previous catalog in place'
    );
    return;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(fetched.bytes);
  } catch (error) {
    logOnce.error(
      stored?.catalogVersion ?? 'invalid',
      'json',
      `Connector catalog is not valid JSON: ${errorMessage(error)}`
    );
    return;
  }

  let manifest;
  try {
    manifest = parseCatalogManifest(parsedJson, logger);
  } catch (error) {
    logOnce.error(
      stored?.catalogVersion ?? 'invalid',
      'parse',
      `Connector catalog manifest is invalid: ${errorMessage(error)}`
    );
    return;
  }

  if (stored && manifest.sequence < stored.sequence) {
    logOnce.warn(
      manifest.catalogVersion,
      'stale_sequence',
      `Ignoring connector catalog sequence ${manifest.sequence}; stored sequence is ${stored.sequence}`
    );
    return;
  }

  const storedHashes = new Map(
    (await storage.listDefinitions()).map((row) => [
      definitionDocId(row.id, row.version),
      row.contentHash,
    ])
  );

  const toFetch: CatalogManifestRow[] = [];
  for (const row of manifest.connectors) {
    if (row.id.startsWith(RESERVED_PREFIX)) {
      logOnce.warn(
        manifest.catalogVersion,
        `reserved:${row.id}`,
        `Skipping reserved connector id "${row.id}"`
      );
      continue;
    }
    const key = definitionDocId(row.id, row.version);
    const storedHash = storedHashes.get(key);
    if (storedHash === row.contentHash) {
      continue;
    }
    if (storedHash !== undefined && storedHash !== row.contentHash) {
      logOnce.error(
        manifest.catalogVersion,
        `immutable:${key}`,
        `Connector catalog definition ${key} changed hash after it was stored; skipping`
      );
      continue;
    }
    toFetch.push(row);
  }

  const fetchedAt = new Date().toISOString();
  await mapWithConcurrency(toFetch, fetchConcurrency, async (row) => {
    try {
      const yaml = await source.readText(row.definitionUrl, MAX_SPEC_BYTES);
      const actualHash = getContentHash(yaml);
      if (actualHash !== row.contentHash) {
        throw new Error(
          `Integrity check failed for "${row.id}" version "${row.version}". Expected ${row.contentHash}, received ${actualHash}.`
        );
      }
      const built = buildVersion(yaml);
      if (built.id !== row.id || built.version !== row.version) {
        throw new Error(
          `Catalog entry "${row.id}@${row.version}" does not match its definition "${built.id}@${built.version}".`
        );
      }
      await storage.putDefinitionCreate({
        id: built.id,
        version: built.version,
        yaml,
        contentHash: actualHash,
        catalogVersion: manifest.catalogVersion,
        addedAt: fetchedAt,
      });
    } catch (error) {
      logOnce.warn(
        manifest.catalogVersion,
        `row:${row.id}@${row.version}`,
        `Failed to store connector "${row.id}@${row.version}": ${errorMessage(error)}`
      );
    }
  });

  const iconHashes = new Set<string>();
  for (const metadata of Object.values(manifest.typeMetadata)) {
    if (metadata.icon) {
      iconHashes.add(metadata.icon.contentHash);
    }
  }
  const existingAssets = await storage.getAssets([...iconHashes]);
  for (const [id, metadata] of Object.entries(manifest.typeMetadata)) {
    const icon = metadata.icon;
    if (!icon || existingAssets.has(icon.contentHash)) {
      continue;
    }
    try {
      const svg = await source.readText(icon.path, MAX_ICON_BYTES);
      const iconHash = getContentHash(svg);
      if (iconHash !== icon.contentHash) {
        throw new Error(
          `Icon integrity check failed for "${id}". Expected ${icon.contentHash}, received ${iconHash}.`
        );
      }
      validateSvgIcon(svg);
      toIconDataUrl(svg);
      await storage.putAssetCreate({
        contentHash: icon.contentHash,
        svg,
        addedAt: fetchedAt,
      });
    } catch (error) {
      logOnce.warn(
        manifest.catalogVersion,
        `icon:${id}`,
        `Failed to store connector icon for "${id}": ${errorMessage(error)}`
      );
    }
  }

  const replaced = await storage.putManifest(
    {
      bytes: fetched.bytes,
      signature: fetched.signature,
      sequence: manifest.sequence,
      catalogVersion: manifest.catalogVersion,
      fetchedAt,
      seqNo: stored?.seqNo,
      primaryTerm: stored?.primaryTerm,
    },
    stored?.sequence
  );
  if (replaced === 'stale') {
    logOnce.warn(
      manifest.catalogVersion,
      'stale_write',
      `Did not replace the connector catalog manifest at sequence ${manifest.sequence}`
    );
    return;
  }

  await reload();
};
