/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { definitionDocId } from './catalog_storage';
import { buildVersion } from './build_version';
import { assertDefinitionYamlHash } from './definition_integrity';
import { parseCatalogManifest } from './parse_manifest';
import { verifyCatalogSignature } from './signature';
import type { BuiltVersion, CatalogManifestRow } from './types';

export interface SpecVersionLoaderOptions {
  logger: Logger;
  publicKeys?: readonly string[];
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const notStoredMessage = (id: string, version: string): string =>
  `Spec ${definitionDocId(id, version)} is not stored in the index`;

const integrityMessagePrefix = (id: string, version: string): string =>
  `Stored definition ${definitionDocId(id, version)} failed integrity check`;

/**
 * Resolves a spec version that is not materialized on this node from the catalog index.
 * One in-flight promise per `id@version`. Never fetches the remote catalog or disk.
 */
export class SpecVersionLoader {
  private storage?: ConnectorCatalogStorage;
  private readonly logger: Logger;
  private readonly publicKeys: readonly string[] | undefined;
  private readonly inFlight = new Map<string, Promise<BuiltVersion>>();

  constructor(options: SpecVersionLoaderOptions) {
    this.logger = options.logger;
    this.publicKeys = options.publicKeys;
  }

  public setStorage(storage: ConnectorCatalogStorage): void {
    this.storage = storage;
  }

  public load = (id: string, version: string): Promise<BuiltVersion> => {
    const key = definitionDocId(id, version);
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }
    const promise = this.resolve(id, version).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  };

  private async manifestRows(): Promise<CatalogManifestRow[] | undefined> {
    if (!this.storage || !this.publicKeys) {
      return undefined;
    }
    try {
      const stored = await this.storage.getManifest();
      if (!stored) {
        return undefined;
      }
      if (!verifyCatalogSignature(stored.bytes, stored.signature, this.publicKeys)) {
        return undefined;
      }
      return parseCatalogManifest(JSON.parse(stored.bytes), this.logger).connectors;
    } catch {
      return undefined;
    }
  }

  private async resolve(id: string, version: string): Promise<BuiltVersion> {
    if (!this.storage) {
      throw new Error(notStoredMessage(id, version));
    }
    try {
      const definition = await this.storage.getDefinition(id, version);
      if (!definition) {
        throw new Error(notStoredMessage(id, version));
      }
      try {
        assertDefinitionYamlHash(definition, await this.manifestRows());
      } catch (error) {
        const message = errorMessage(error);
        this.logger.error(message);
        throw new Error(message);
      }
      return buildVersion(definition.yaml);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === notStoredMessage(id, version) ||
          error.message.startsWith(integrityMessagePrefix(id, version)))
      ) {
        throw error;
      }
      throw new Error(
        `${notStoredMessage(id, version)}${errorMessage(error) ? ` (${errorMessage(error)})` : ''}`
      );
    }
  }
}
