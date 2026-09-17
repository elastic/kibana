/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DeclarativeCatalogSkippedEntry, DeclarativeCatalogVersionEntry } from './types';
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
}

export interface CatalogSnapshot {
  catalogVersion: string;
  versions: DeclarativeCatalogVersionEntry[];
  assets: RawConnectorSpecAsset[];
  skipped: DeclarativeCatalogSkippedEntry[];
}

const RESERVED_PREFIX = '.declarative-';

/** Fetches a catalog snapshot of active, non-reserved connector spec assets. */
export class CatalogSpecSource extends ConnectorSpecSource {
  constructor(private readonly options: CatalogSpecSourceOptions) {
    super();
  }

  public async loadRawSpecs(): Promise<RawConnectorSpecAsset[]> {
    const snapshot = await this.loadSnapshot();
    return snapshot.assets;
  }

  public async loadSnapshot(): Promise<CatalogSnapshot> {
    const timeoutMs = this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const manifestText = await fetchCatalogText({
      registryUrl: this.options.registryUrl,
      path: 'catalog.json',
      maxBytes: MAX_CATALOG_BYTES,
      timeoutMs,
    });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(manifestText);
    } catch (error) {
      throw new Error('Declarative connector catalog is not valid JSON.', { cause: error });
    }

    const manifest = parseDeclarativeCatalogManifest(parsedJson);
    const versions: DeclarativeCatalogVersionEntry[] = [];
    const skipped: DeclarativeCatalogSkippedEntry[] = [];
    const assets: RawConnectorSpecAsset[] = [];

    for (const entry of manifest.connectors) {
      const isActive = manifest.activeVersions[entry.id] === entry.version;
      if (entry.id.startsWith(RESERVED_PREFIX)) {
        skipped.push({
          id: entry.id,
          version: entry.version,
          reason: 'reserved_prefix',
        });
        continue;
      }

      versions.push({
        id: entry.id,
        version: entry.version,
        status: isActive ? 'active' : 'published',
      });

      if (!isActive) {
        continue;
      }

      try {
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
        const asset: RawConnectorSpecAsset = { yamlPath, yaml };

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

        assets.push(asset);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        this.options.logger.warn(
          `Failed to load declarative catalog connector "${entry.id}@${entry.version}": ${detail}`
        );
        skipped.push({
          id: entry.id,
          version: entry.version,
          reason: 'load_failed',
          detail,
        });
      }
    }

    return {
      catalogVersion: manifest.catalogVersion,
      versions,
      assets,
      skipped,
    };
  }
}
