/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  DeclarativeCatalogEntry,
  DeclarativeCatalogManifest,
  DeclarativeCatalogSkippedEntry,
  DeclarativeCatalogVersionEntry,
} from './types';
import { ConnectorSpecSource, type RawConnectorSpecAsset } from './spec_source';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  fetchCatalogText,
  MAX_CATALOG_BYTES,
  MAX_ICON_BYTES,
  MAX_SPEC_BYTES,
  resolveAssetUrl,
  resolveRegistryUrl,
} from './catalog_client';
import { getContentHash } from './icon';
import { parseDeclarativeCatalogManifest, parseDeclarativeConnectorSpec } from './parse_spec';

export interface CatalogSpecSourceOptions {
  registryUrl: string;
  requestTimeoutMs?: number;
  logger: Logger;
  /** Parallel definition fetches per refresh. */
  fetchConcurrency?: number;
}

export interface CatalogSnapshotAsset extends RawConnectorSpecAsset {
  id: string;
  version: string;
  contentHash: string;
}

export interface CatalogSnapshot {
  catalogVersion: string;
  /** Catalog-active version per connector id, reserved ids removed. */
  activeVersions: Record<string, string>;
  versions: DeclarativeCatalogVersionEntry[];
  /** Fetched definitions. Entries whose stored hash already matched are not refetched. */
  assets: CatalogSnapshotAsset[];
  skipped: DeclarativeCatalogSkippedEntry[];
}

export interface LoadSnapshotOptions {
  /** `id@version` to contentHash of definitions already stored. Matching entries are skipped. */
  storedHashes?: ReadonlyMap<string, string>;
}

const RESERVED_PREFIX = '.declarative-';
const DEFAULT_FETCH_CONCURRENCY = 5;

export const versionKey = (id: string, version: string): string => `${id}@${version}`;

/** Runs `task` over `items` with at most `limit` promises in flight; preserves input order. */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

/** Fetches a catalog snapshot: every listed, non-reserved connector spec asset. */
export class CatalogSpecSource extends ConnectorSpecSource {
  constructor(private readonly options: CatalogSpecSourceOptions) {
    super();
  }

  public async loadRawSpecs(): Promise<RawConnectorSpecAsset[]> {
    const snapshot = await this.loadSnapshot();
    return snapshot.assets.filter((asset) => snapshot.activeVersions[asset.id] === asset.version);
  }

  public async loadManifest(): Promise<DeclarativeCatalogManifest> {
    const manifestText = await fetchCatalogText({
      registryUrl: this.options.registryUrl,
      path: 'catalog.json',
      maxBytes: MAX_CATALOG_BYTES,
      timeoutMs: this.timeoutMs(),
    });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(manifestText);
    } catch (error) {
      throw new Error('Declarative connector catalog is not valid JSON.', { cause: error });
    }
    return parseDeclarativeCatalogManifest(parsedJson);
  }

  /** Fetches one exact `id@version` listed in the manifest. Undefined when not listed. */
  public async loadVersion(id: string, version: string): Promise<CatalogSnapshotAsset | undefined> {
    const manifest = await this.loadManifest();
    const entry = manifest.connectors.find(
      (candidate) => candidate.id === id && candidate.version === version
    );
    if (!entry || entry.id.startsWith(RESERVED_PREFIX)) {
      return undefined;
    }
    return this.fetchEntry(entry);
  }

  public async loadSnapshot({ storedHashes }: LoadSnapshotOptions = {}): Promise<CatalogSnapshot> {
    const manifest = await this.loadManifest();
    const versions: DeclarativeCatalogVersionEntry[] = [];
    const skipped: DeclarativeCatalogSkippedEntry[] = [];
    const activeVersions: Record<string, string> = {};
    const toFetch: DeclarativeCatalogEntry[] = [];

    for (const entry of manifest.connectors) {
      if (entry.id.startsWith(RESERVED_PREFIX)) {
        skipped.push({ id: entry.id, version: entry.version, reason: 'reserved_prefix' });
        continue;
      }
      const isActive = manifest.activeVersions[entry.id] === entry.version;
      if (isActive) {
        activeVersions[entry.id] = entry.version;
      }
      versions.push({
        id: entry.id,
        version: entry.version,
        status: isActive ? 'active' : 'published',
      });
      if (storedHashes?.get(versionKey(entry.id, entry.version)) === entry.contentHash) {
        continue;
      }
      toFetch.push(entry);
    }

    const fetched = await mapWithConcurrency(
      toFetch,
      this.options.fetchConcurrency ?? DEFAULT_FETCH_CONCURRENCY,
      async (entry): Promise<CatalogSnapshotAsset | DeclarativeCatalogSkippedEntry> => {
        try {
          return await this.fetchEntry(entry);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          this.options.logger.warn(
            `Failed to load declarative catalog connector "${entry.id}@${entry.version}": ${detail}`
          );
          return { id: entry.id, version: entry.version, reason: 'load_failed', detail };
        }
      }
    );

    const assets: CatalogSnapshotAsset[] = [];
    for (const result of fetched) {
      if ('reason' in result) {
        skipped.push(result);
      } else {
        assets.push(result);
      }
    }

    return {
      catalogVersion: manifest.catalogVersion,
      activeVersions,
      versions,
      assets,
      skipped,
    };
  }

  private timeoutMs(): number {
    return this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  private async fetchEntry(entry: DeclarativeCatalogEntry): Promise<CatalogSnapshotAsset> {
    const timeoutMs = this.timeoutMs();
    const yaml = await fetchCatalogText({
      registryUrl: this.options.registryUrl,
      path: entry.definitionUrl,
      maxBytes: MAX_SPEC_BYTES,
      timeoutMs,
    });
    const actualHash = getContentHash(yaml);
    if (actualHash !== entry.contentHash) {
      throw new Error(
        `Integrity check failed for "${entry.id}" version "${entry.version}". Expected ${entry.contentHash}, received ${actualHash}.`
      );
    }

    const parsed = parseDeclarativeConnectorSpec(yaml);
    if (parsed.id !== entry.id || parsed.version !== entry.version) {
      throw new Error(
        `Catalog entry "${entry.id}@${entry.version}" does not match its definition "${parsed.id}@${parsed.version}".`
      );
    }

    const yamlPath = resolveRegistryUrl(this.options.registryUrl, entry.definitionUrl);
    const asset: CatalogSnapshotAsset = {
      id: entry.id,
      version: entry.version,
      contentHash: actualHash,
      yamlPath,
      yaml,
    };

    if (parsed.metadata.icon) {
      const iconPath = resolveAssetUrl(
        this.options.registryUrl,
        entry.definitionUrl,
        parsed.metadata.icon.path
      );
      const icon = await fetchCatalogText({
        registryUrl: this.options.registryUrl,
        path: iconPath,
        maxBytes: MAX_ICON_BYTES,
        timeoutMs,
      });
      const iconHash = getContentHash(icon);
      if (iconHash !== parsed.metadata.icon.contentHash) {
        throw new Error(
          `Icon integrity check failed for "${entry.id}" version "${entry.version}".`
        );
      }
      asset.iconPath = iconPath;
      asset.icon = icon;
    }

    return asset;
  }
}
