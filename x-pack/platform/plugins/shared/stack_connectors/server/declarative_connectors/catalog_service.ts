/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import type { Logger } from '@kbn/core/server';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { isNotFoundError } from '@kbn/es-errors';
import { materializeDeclarativeConnectorSpec } from './materialize_spec';
import { parseDeclarativeCatalogManifest, parseDeclarativeConnectorSpec } from './parse_spec';
import {
  DECLARATIVE_CONNECTOR_CATALOG_DOCUMENT_ID,
  DECLARATIVE_CONNECTOR_CATALOG_INDEX,
  type DeclarativeConnectorCatalogStorage,
} from './storage';
import type {
  DeclarativeCatalogEntry,
  DeclarativeCatalogHealth,
  StoredDeclarativeCatalog,
  StoredDeclarativeSpec,
} from './types';

const MAX_CATALOG_BYTES = 1024 * 1024;
const MAX_SPEC_BYTES = 256 * 1024;
const MAX_ICON_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

interface DeclarativeConnectorCatalogServiceOptions {
  registryUrl: string;
  refreshIntervalMs: number;
  logger: Logger;
}

interface MaterializedCatalogState {
  storedSpecs: Map<string, StoredDeclarativeSpec>;
  materializedSpecs: Map<string, ConnectorSpec>;
  activeVersions: Map<string, string>;
  catalogVersion: string;
}

const buildSpecKey = (id: string, version: string): string => `${id}@${version}`;

const getContentHash = (raw: string): string =>
  `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;

const validateSvgIcon = (raw: string): void => {
  if (!/<svg[\s>]/i.test(raw)) {
    throw new Error('Declarative connector icon is not an SVG document.');
  }
  const unsafeMarkup =
    /<script[\s>]|<style[\s>]|<foreignObject[\s>]|\son[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?!#)|url\(\s*["']?(?!#)/i;
  if (unsafeMarkup.test(raw)) {
    throw new Error('Declarative connector icon contains unsupported active or external content.');
  }
};

export class DeclarativeConnectorCatalogService {
  private activeVersions = new Map<string, string>();
  private materializedSpecs = new Map<string, ConnectorSpec>();
  private storedSpecs = new Map<string, StoredDeclarativeSpec>();
  private storage?: DeclarativeConnectorCatalogStorage;
  private initialization?: Promise<void>;
  private refreshing?: Promise<void>;
  private refreshTimer?: NodeJS.Timeout;
  private activeCatalogVersion?: string;
  private lastRefreshAt?: string;
  private lastError?: { message: string; at: string };

  constructor(private readonly options: DeclarativeConnectorCatalogServiceOptions) {}

  public start(storage: DeclarativeConnectorCatalogStorage): void {
    this.storage = storage;
    this.initialization = this.initialize();
    if (this.options.refreshIntervalMs > 0) {
      this.refreshTimer = setInterval(() => {
        void this.refresh().catch((error) => {
          this.options.logger.warn(
            `Declarative connector catalog refresh failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
      }, this.options.refreshIntervalMs);
      this.refreshTimer.unref();
    }
  }

  public stop(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  public getCurrentSpec = (id: string): ConnectorSpec | undefined => this.getCachedSpec(id);

  public getCachedSpec = (id: string, version?: string): ConnectorSpec | undefined => {
    const resolvedVersion = version ?? this.activeVersions.get(id);
    return resolvedVersion
      ? this.materializedSpecs.get(buildSpecKey(id, resolvedVersion))
      : undefined;
  };

  public getCurrentSpecs = (): ConnectorSpec[] =>
    [...this.activeVersions].flatMap(([id, version]) => {
      const spec = this.materializedSpecs.get(buildSpecKey(id, version));
      return spec ? [spec] : [];
    });

  public getSpecs = (id: string): ConnectorSpec[] =>
    [...this.materializedSpecs.values()].filter((spec) => spec.metadata.id === id);

  public getSpec = async (id: string, version?: string): Promise<ConnectorSpec | undefined> => {
    await this.initialization;
    const resolvedVersion = version ?? this.activeVersions.get(id);
    return resolvedVersion
      ? this.materializedSpecs.get(buildSpecKey(id, resolvedVersion))
      : undefined;
  };

  public getHealth = (): DeclarativeCatalogHealth => ({
    enabled: true,
    ready: this.activeVersions.size > 0,
    sourceUrl: this.options.registryUrl,
    activeCatalogVersion: this.activeCatalogVersion,
    connectorVersions: Object.fromEntries(this.activeVersions),
    cachedSpecificationCount: this.storedSpecs.size,
    lastRefreshAt: this.lastRefreshAt,
    lastError: this.lastError,
  });

  public refresh = async (): Promise<void> => {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.runRefresh()
      .catch((error) => {
        this.recordError(error);
        throw error;
      })
      .finally(() => {
        this.refreshing = undefined;
      });
    return this.refreshing;
  };

  private async initialize(): Promise<void> {
    let loadedLastKnownGood = false;
    try {
      loadedLastKnownGood = await this.loadLastKnownGood();
    } catch (error) {
      this.recordError(error);
      this.options.logger.warn(
        `Failed to load the last-known-good declarative connector catalog: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    try {
      await this.refresh();
    } catch (error) {
      this.recordError(error);
      this.options.logger.warn(
        `Declarative connector catalog refresh failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (!loadedLastKnownGood) {
        this.options.logger.warn(
          'Declarative connectors are unavailable because no last-known-good catalog exists.'
        );
      }
    }
  }

  private async loadLastKnownGood(): Promise<boolean> {
    if (!this.storage) return false;
    try {
      const response = await this.storage.get({
        id: DECLARATIVE_CONNECTOR_CATALOG_DOCUMENT_ID,
      });
      const storedCatalog = response._source?.catalog;
      if (!storedCatalog) return false;
      this.activate(this.materializeCatalog(storedCatalog));
      this.options.logger.info(
        `Loaded declarative connector catalog "${storedCatalog.catalogVersion}" from "${DECLARATIVE_CONNECTOR_CATALOG_INDEX}".`
      );
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }

  private async runRefresh(): Promise<void> {
    if (!this.storage) {
      throw new Error('Declarative connector catalog service has not started.');
    }
    const manifestUrl = this.resolveRegistryUrl('catalog.json');
    const manifest = parseDeclarativeCatalogManifest(
      JSON.parse(await this.fetchText(manifestUrl, MAX_CATALOG_BYTES))
    );
    const seenVersions = new Set<string>();
    const freshSpecs: StoredDeclarativeSpec[] = [];

    for (const entry of manifest.connectors) {
      this.validateCatalogEntry(entry, seenVersions);
      const definitionUrl = this.resolveRegistryUrl(entry.definitionUrl);
      const raw = await this.fetchText(definitionUrl, MAX_SPEC_BYTES);
      const actualHash = getContentHash(raw);
      if (actualHash !== entry.contentHash) {
        throw new Error(
          `Integrity check failed for "${entry.id}" version "${entry.version}". Expected ${entry.contentHash}, received ${actualHash}.`
        );
      }
      const parsed = parseDeclarativeConnectorSpec(raw);
      if (parsed.id !== entry.id || parsed.version !== entry.version) {
        throw new Error(
          `Catalog entry "${entry.id}@${entry.version}" does not match its definition "${parsed.id}@${parsed.version}".`
        );
      }
      const iconRaw = parsed.metadata.icon
        ? await this.fetchIcon(entry.definitionUrl, parsed.metadata.icon.path)
        : undefined;
      if (iconRaw && getContentHash(iconRaw) !== parsed.metadata.icon?.contentHash) {
        throw new Error(
          `Icon integrity check failed for "${entry.id}" version "${entry.version}".`
        );
      }
      if (iconRaw) validateSvgIcon(iconRaw);
      freshSpecs.push({ ...entry, raw, ...(iconRaw ? { iconRaw } : {}) });
    }

    const mergedSpecs = new Map(this.storedSpecs);
    for (const spec of freshSpecs) {
      mergedSpecs.set(buildSpecKey(spec.id, spec.version), spec);
    }
    const storedCatalog: StoredDeclarativeCatalog = {
      catalogVersion: manifest.catalogVersion,
      activeVersions: manifest.activeVersions,
      specifications: [...mergedSpecs.values()],
      sourceUrl: this.options.registryUrl,
      fetchedAt: new Date().toISOString(),
    };

    const nextState = this.materializeCatalog(storedCatalog);
    await this.storage.index({
      id: DECLARATIVE_CONNECTOR_CATALOG_DOCUMENT_ID,
      document: {
        catalog: storedCatalog,
        updated_at: storedCatalog.fetchedAt,
      },
    });
    this.activate(nextState);
    this.lastRefreshAt = storedCatalog.fetchedAt;
    this.lastError = undefined;
    this.options.logger.info(
      `Activated declarative connector catalog "${manifest.catalogVersion}" with ${manifest.connectors.length} connectors.`
    );
  }

  private materializeCatalog(storedCatalog: StoredDeclarativeCatalog): MaterializedCatalogState {
    const nextStoredSpecs = new Map<string, StoredDeclarativeSpec>();
    const nextMaterializedSpecs = new Map<string, ConnectorSpec>();
    for (const stored of storedCatalog.specifications) {
      if (getContentHash(stored.raw) !== stored.contentHash) {
        throw new Error(
          `Stored declarative connector "${stored.id}@${stored.version}" failed its integrity check.`
        );
      }
      const parsed = parseDeclarativeConnectorSpec(stored.raw);
      if (parsed.id !== stored.id || parsed.version !== stored.version) {
        throw new Error(
          `Stored declarative connector "${stored.id}@${stored.version}" is invalid.`
        );
      }
      const key = buildSpecKey(stored.id, stored.version);
      nextStoredSpecs.set(key, stored);
      const icon = parsed.metadata.icon;
      let iconDataUrl: string | undefined;
      if (icon) {
        if (!stored.iconRaw || getContentHash(stored.iconRaw) !== icon.contentHash) {
          throw new Error(
            `Stored declarative connector icon "${stored.id}@${stored.version}" failed its integrity check.`
          );
        }
        validateSvgIcon(stored.iconRaw);
        iconDataUrl = `data:image/svg+xml;base64,${Buffer.from(stored.iconRaw, 'utf8').toString(
          'base64'
        )}`;
      }
      nextMaterializedSpecs.set(key, materializeDeclarativeConnectorSpec(parsed, iconDataUrl));
    }

    const nextActiveVersions = new Map(Object.entries(storedCatalog.activeVersions));
    for (const [id, version] of nextActiveVersions) {
      const activeSpec = nextMaterializedSpecs.get(buildSpecKey(id, version));
      if (!activeSpec) {
        throw new Error(`Active declarative connector "${id}@${version}" is not cached.`);
      }
    }

    return {
      storedSpecs: nextStoredSpecs,
      materializedSpecs: nextMaterializedSpecs,
      activeVersions: nextActiveVersions,
      catalogVersion: storedCatalog.catalogVersion,
    };
  }

  private activate(state: MaterializedCatalogState): void {
    this.storedSpecs = state.storedSpecs;
    this.materializedSpecs = state.materializedSpecs;
    this.activeVersions = state.activeVersions;
    this.activeCatalogVersion = state.catalogVersion;
  }

  private validateCatalogEntry(entry: DeclarativeCatalogEntry, seenVersions: Set<string>): void {
    const key = buildSpecKey(entry.id, entry.version);
    if (seenVersions.has(key)) {
      throw new Error(`Catalog contains duplicate connector version "${key}".`);
    }
    seenVersions.add(key);
  }

  private resolveRegistryUrl(path: string): string {
    const registryUrl = new URL(
      this.options.registryUrl.endsWith('/')
        ? this.options.registryUrl
        : `${this.options.registryUrl}/`
    );
    const resolved = new URL(path.replace(/^\/+/, ''), registryUrl);
    if (resolved.origin !== registryUrl.origin) {
      throw new Error('Declarative connector catalog URLs must remain on the registry origin.');
    }
    return resolved.toString();
  }

  private async fetchIcon(definitionPath: string, iconPath: string): Promise<string> {
    const definitionUrl = this.resolveRegistryUrl(definitionPath);
    const iconUrl = new URL(iconPath, definitionUrl);
    const registryOrigin = new URL(this.options.registryUrl).origin;
    if (iconUrl.origin !== registryOrigin) {
      throw new Error('Declarative connector icon URLs must remain on the registry origin.');
    }
    return this.fetchText(iconUrl.toString(), MAX_ICON_BYTES);
  }

  private async fetchText(url: string, maxBytes: number): Promise<string> {
    const response = await fetch(url, {
      timeout: REQUEST_TIMEOUT_MS,
      size: maxBytes,
      headers: {
        'User-Agent': 'Kibana declarative-connectors-poc',
      },
    });
    if (!response.ok) {
      throw new Error(`Catalog request failed with HTTP ${response.status} at ${url}.`);
    }
    const expectedOrigin = new URL(this.options.registryUrl).origin;
    if (new URL(response.url).origin !== expectedOrigin) {
      throw new Error(
        'Declarative connector catalog redirects must remain on the registry origin.'
      );
    }
    return response.text();
  }

  private recordError(error: unknown): void {
    this.lastError = {
      message: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString(),
    };
  }
}
