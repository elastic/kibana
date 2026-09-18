/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { definitionDocId } from './catalog_storage';
import type { MaterializedSpec } from './load_declarative_specs';
import { materializeDeclarativeAsset } from './load_declarative_specs';
import type { RawConnectorSpecAsset } from './spec_source';

/** A source that can return one exact `id@version` asset, or undefined when not listed. */
export interface VersionAssetSource {
  loadVersion(id: string, version: string): Promise<RawConnectorSpecAsset | undefined>;
}

export interface SpecVersionLoaderOptions {
  logger: Logger;
  /** Registry fetch by exact `id@version`, verified against the manifest hash. */
  registrySource?: VersionAssetSource;
  /** Shipped disk snapshot, last resort before failing closed. */
  diskSource?: VersionAssetSource;
}

interface SourceHit {
  asset: RawConnectorSpecAsset;
  materialized: MaterializedSpec;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Resolves a spec version that is not materialized on this node: index first, then the
 * registry, then the disk snapshot. One in-flight promise per `id@version`.
 */
export class SpecVersionLoader {
  private storage?: ConnectorCatalogStorage;
  private readonly inFlight = new Map<string, Promise<MaterializedSpec>>();

  constructor(private readonly options: SpecVersionLoaderOptions) {}

  public setStorage(storage: ConnectorCatalogStorage): void {
    this.storage = storage;
  }

  public load = (id: string, version: string): Promise<MaterializedSpec> => {
    const key = definitionDocId(id, version);
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }
    const promise = this.resolve(id, version).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  };

  private async resolve(id: string, version: string): Promise<MaterializedSpec> {
    const failures: string[] = [];

    const fromIndex = await this.fromIndex(id, version, failures);
    if (fromIndex) {
      return fromIndex;
    }

    const { registrySource, diskSource } = this.options;
    const fromRegistry = await this.fromSource(registrySource, 'registry', id, version, failures);
    if (fromRegistry) {
      await this.persist(fromRegistry);
      return fromRegistry.materialized;
    }

    const fromDisk = await this.fromSource(diskSource, 'disk snapshot', id, version, failures);
    if (fromDisk) {
      return fromDisk.materialized;
    }

    throw new Error(
      `Spec ${definitionDocId(id, version)} could not be obtained (${failures.join('; ')}).`
    );
  }

  private async fromIndex(
    id: string,
    version: string,
    failures: string[]
  ): Promise<MaterializedSpec | undefined> {
    if (!this.storage) {
      failures.push('index: storage not ready');
      return undefined;
    }
    try {
      const definition = await this.storage.getDefinition(id, version);
      if (!definition) {
        failures.push('index: definition missing');
        return undefined;
      }
      return materializeDeclarativeAsset({
        yamlPath: definitionDocId(id, version),
        yaml: definition.yaml,
        icon: definition.iconSvg,
      });
    } catch (error) {
      failures.push(`index: ${errorMessage(error)}`);
      return undefined;
    }
  }

  private async fromSource(
    source: VersionAssetSource | undefined,
    label: string,
    id: string,
    version: string,
    failures: string[]
  ): Promise<SourceHit | undefined> {
    if (!source) {
      failures.push(`${label}: not configured`);
      return undefined;
    }
    try {
      const asset = await source.loadVersion(id, version);
      if (!asset) {
        failures.push(`${label}: not listed`);
        return undefined;
      }
      const materialized = materializeDeclarativeAsset(asset);
      if (materialized.id !== id || materialized.version !== version) {
        failures.push(
          `${label}: returned ${materialized.id}@${materialized.version} instead of ${id}@${version}`
        );
        return undefined;
      }
      return { asset, materialized };
    } catch (error) {
      failures.push(`${label}: ${errorMessage(error)}`);
      return undefined;
    }
  }

  private async persist({ asset, materialized }: SourceHit): Promise<void> {
    if (!this.storage) {
      return;
    }
    try {
      await this.storage.putDefinitionCreate({
        id: materialized.id,
        version: materialized.version,
        yaml: asset.yaml,
        iconSvg: asset.icon,
        contentHash: materialized.contentHash,
        addedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.options.logger.warn(
        `Failed to store lazily loaded spec ${definitionDocId(
          materialized.id,
          materialized.version
        )}: ${errorMessage(error)}`
      );
    }
  }
}
