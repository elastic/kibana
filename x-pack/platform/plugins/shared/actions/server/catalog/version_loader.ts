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
import type { BuiltVersion } from './types';

export interface SpecVersionLoaderOptions {
  logger: Logger;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Resolves a spec version that is not materialized on this node from the catalog index.
 * One in-flight promise per `id@version`. Never fetches the remote catalog or disk.
 */
export class SpecVersionLoader {
  private storage?: ConnectorCatalogStorage;
  private readonly inFlight = new Map<string, Promise<BuiltVersion>>();

  constructor(_options: SpecVersionLoaderOptions) {}

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

  private async resolve(id: string, version: string): Promise<BuiltVersion> {
    if (!this.storage) {
      throw new Error(`Spec ${definitionDocId(id, version)} is not stored in the index`);
    }
    try {
      const definition = await this.storage.getDefinition(id, version);
      if (!definition) {
        throw new Error(`Spec ${definitionDocId(id, version)} is not stored in the index`);
      }
      return buildVersion(definition.yaml);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === `Spec ${definitionDocId(id, version)} is not stored in the index`
      ) {
        throw error;
      }
      throw new Error(
        `Spec ${definitionDocId(id, version)} is not stored in the index${
          errorMessage(error) ? ` (${errorMessage(error)})` : ''
        }`
      );
    }
  }
}
