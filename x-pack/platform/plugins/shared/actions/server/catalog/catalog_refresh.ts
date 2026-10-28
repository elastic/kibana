/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definitionDocId } from './catalog_storage';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { getContentHash, validateSvgIcon } from './content_hash';
import type { CatalogLogOnce } from './log_once';
import { parseCatalogManifest } from './parse_manifest';
import { parseDefinitionHeader } from './parse_definition_header';
import { MAX_ICON_BYTES, MAX_SPEC_BYTES } from './remote_catalog_source';
import { verifyCatalogSignature } from './signature';
import type {
  CatalogManifest,
  CatalogManifestRow,
  CatalogRefreshResult,
  CatalogSource,
  StoredManifest,
} from './types';

const DEFAULT_FETCH_CONCURRENCY = 5;
const CATALOG_REFRESH_ABORTED = Symbol('catalog-refresh-aborted');

export interface RunCatalogRefreshDeps {
  source: CatalogSource;
  storage: ConnectorCatalogStorage;
  publicKeys: readonly string[];
  logOnce: CatalogLogOnce;
  reload: () => Promise<void>;
  fetchConcurrency?: number;
  signal?: AbortSignal;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw CATALOG_REFRESH_ABORTED;
  }
};

const integrityError = (message: string): Error => new Error(message);

const prepareDefinitions = async ({
  source,
  rows,
  signal,
}: {
  source: CatalogSource;
  rows: CatalogManifestRow[];
  signal?: AbortSignal;
}): Promise<Array<{ row: CatalogManifestRow; yaml: string }>> => {
  const prepared: Array<{ row: CatalogManifestRow; yaml: string }> = [];
  for (const row of rows) {
    throwIfAborted(signal);
    const yaml = await source.readText(row.definitionUrl, MAX_SPEC_BYTES, signal);
    const actualHash = getContentHash(yaml);
    if (actualHash !== row.contentHash) {
      throw integrityError(
        `Integrity check failed for "${row.id}" version "${row.version}". Expected ${row.contentHash}, received ${actualHash}.`
      );
    }
    const header = parseDefinitionHeader(yaml);
    if (header.id !== row.id || header.version !== row.version) {
      throw integrityError(
        `Catalog entry "${row.id}@${row.version}" does not match its definition "${header.id}@${header.version}".`
      );
    }
    prepared.push({ row, yaml });
  }
  return prepared;
};

const prepareIcons = async ({
  source,
  manifest,
  signal,
}: {
  source: CatalogSource;
  manifest: CatalogManifest;
  signal?: AbortSignal;
}): Promise<Array<{ contentHash: string; svg: string }>> => {
  const prepared: Array<{ contentHash: string; svg: string }> = [];
  const seen = new Set<string>();
  for (const [id, metadata] of Object.entries(manifest.typeMetadata)) {
    const icon = metadata.icon;
    if (!icon || seen.has(icon.contentHash)) {
      continue;
    }
    seen.add(icon.contentHash);
    throwIfAborted(signal);
    const svg = await source.readText(icon.path, MAX_ICON_BYTES, signal);
    const iconHash = getContentHash(svg);
    if (iconHash !== icon.contentHash) {
      throw integrityError(
        `Icon integrity check failed for "${id}". Expected ${icon.contentHash}, received ${iconHash}.`
      );
    }
    validateSvgIcon(svg);
    prepared.push({ contentHash: icon.contentHash, svg });
  }
  return prepared;
};

const storePrepared = async ({
  storage,
  manifest,
  definitions,
  icons,
  addedAt,
}: {
  storage: ConnectorCatalogStorage;
  manifest: CatalogManifest;
  definitions: Array<{ row: CatalogManifestRow; yaml: string }>;
  icons: Array<{ contentHash: string; svg: string }>;
  addedAt: string;
}): Promise<number> => {
  let storedCount = 0;
  for (const { row, yaml } of definitions) {
    const result = await storage.putDefinitionCreate({
      id: row.id,
      version: row.version,
      yaml,
      contentHash: row.contentHash,
      catalogVersion: manifest.catalogVersion,
      addedAt,
    });
    if (result === 'created') {
      storedCount += 1;
    }
  }
  for (const icon of icons) {
    const result = await storage.putAssetCreate({
      contentHash: icon.contentHash,
      svg: icon.svg,
      addedAt,
    });
    if (result === 'created') {
      storedCount += 1;
    }
  }
  return storedCount;
};

const failed = (
  logOnce: CatalogLogOnce,
  error: unknown,
  catalogVersion: string
): CatalogRefreshResult => {
  if (error !== CATALOG_REFRESH_ABORTED) {
    logOnce.warn(
      catalogVersion,
      'integrity',
      `Connector catalog refresh failed: ${errorMessage(error)}`
    );
  }
  return { outcome: 'failed', stored: 0 };
};

const replaceManifest = async ({
  storage,
  fetched,
  manifest,
  stored,
  storedCount,
  reload,
  logOnce,
}: {
  storage: ConnectorCatalogStorage;
  fetched: { bytes: string; signature: string };
  manifest: CatalogManifest;
  stored: StoredManifest | undefined;
  storedCount: number;
  reload: () => Promise<void>;
  logOnce: CatalogLogOnce;
}): Promise<CatalogRefreshResult> => {
  const replaced = await storage.putManifest(
    {
      bytes: fetched.bytes,
      signature: fetched.signature,
      sequence: manifest.sequence,
      catalogVersion: manifest.catalogVersion,
      fetchedAt: new Date().toISOString(),
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
    return { outcome: 'stale', stored: storedCount };
  }
  await reload();
  return { outcome: 'replaced', stored: storedCount };
};

/** Fetches, verifies, and stores a signed connector catalog. Failures leave the stored manifest in place. */
export const runCatalogRefresh = async ({
  source,
  storage,
  publicKeys,
  logOnce,
  reload,
  fetchConcurrency = DEFAULT_FETCH_CONCURRENCY,
  signal,
}: RunCatalogRefreshDeps): Promise<CatalogRefreshResult> => {
  // Row fetches stay sequential so an abort stops before the next row.
  void fetchConcurrency;
  let fetched: { bytes: string; signature: string };
  try {
    throwIfAborted(signal);
    fetched = await source.readManifest(signal);
  } catch (error) {
    if (error === CATALOG_REFRESH_ABORTED) {
      return { outcome: 'failed', stored: 0 };
    }
    logOnce.warnThenDebug(
      'fetch_manifest',
      `Failed to fetch the connector catalog from ${source.origin}: ${errorMessage(error)}`
    );
    return { outcome: 'failed', stored: 0 };
  }

  logOnce.clear('fetch_manifest');

  const stored = await storage.getManifest();
  const sameBytes = stored !== undefined && stored.bytes === fetched.bytes;

  if (sameBytes && stored && verifyCatalogSignature(stored.bytes, stored.signature, publicKeys)) {
    let parsed: CatalogManifest;
    try {
      parsed = parseCatalogManifest(JSON.parse(stored.bytes), logOnce);
    } catch (error) {
      logOnce.error(
        stored.catalogVersion,
        'parse',
        `Stored connector catalog manifest is invalid: ${errorMessage(error)}`
      );
      return { outcome: 'failed', stored: 0 };
    }
    const existing = await storage.existsDefinitions(parsed.connectors);
    const missing = parsed.connectors.filter(
      (row) => !existing.has(definitionDocId(row.id, row.version))
    );
    const iconHashes = [
      ...new Set(
        Object.values(parsed.typeMetadata)
          .map((metadata) => metadata.icon?.contentHash)
          .filter((hash): hash is string => hash !== undefined)
      ),
    ];
    const existingAssets = await storage.getAssets(iconHashes);
    const missingIconHashes = new Set(iconHashes.filter((hash) => !existingAssets.has(hash)));
    if (missing.length === 0 && missingIconHashes.size === 0) {
      return { outcome: 'same', stored: 0 };
    }
    try {
      const definitions = await prepareDefinitions({ source, rows: missing, signal });
      const icons = await prepareIcons({
        source,
        manifest: {
          ...parsed,
          typeMetadata: Object.fromEntries(
            Object.entries(parsed.typeMetadata).filter(
              ([, metadata]) =>
                metadata.icon !== undefined && missingIconHashes.has(metadata.icon.contentHash)
            )
          ),
        },
        signal,
      });
      const storedCount = await storePrepared({
        storage,
        manifest: parsed,
        definitions,
        icons,
        addedAt: new Date().toISOString(),
      });
      if (storedCount > 0) {
        await reload();
      }
      return { outcome: 'same', stored: storedCount };
    } catch (error) {
      return failed(logOnce, error, parsed.catalogVersion);
    }
  }

  if (!verifyCatalogSignature(fetched.bytes, fetched.signature, publicKeys)) {
    logOnce.warn(
      stored?.catalogVersion ?? 'unsigned',
      'signature',
      'Connector catalog signature verification failed; leaving the previous catalog in place'
    );
    return { outcome: 'failed', stored: 0 };
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
    return { outcome: 'failed', stored: 0 };
  }

  let manifest: CatalogManifest;
  try {
    manifest = parseCatalogManifest(parsedJson, logOnce);
  } catch (error) {
    logOnce.error(
      stored?.catalogVersion ?? 'invalid',
      'parse',
      `Connector catalog manifest is invalid: ${errorMessage(error)}`
    );
    return { outcome: 'failed', stored: 0 };
  }

  if (stored && manifest.sequence <= stored.sequence) {
    logOnce.warn(
      manifest.catalogVersion,
      'stale_sequence',
      `Ignoring connector catalog sequence ${manifest.sequence}; stored sequence is ${stored.sequence}`
    );
    return { outcome: 'stale', stored: 0 };
  }

  try {
    const definitions = await prepareDefinitions({ source, rows: manifest.connectors, signal });
    const icons = await prepareIcons({ source, manifest, signal });
    const storedCount = await storePrepared({
      storage,
      manifest,
      definitions,
      icons,
      addedAt: new Date().toISOString(),
    });
    return await replaceManifest({
      storage,
      fetched,
      manifest,
      stored,
      storedCount,
      reload,
      logOnce,
    });
  } catch (error) {
    return failed(logOnce, error, manifest.catalogVersion);
  }
};
