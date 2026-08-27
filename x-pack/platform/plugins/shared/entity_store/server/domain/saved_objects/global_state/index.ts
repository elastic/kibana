/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import {
  EntityStoreGlobalState,
  EntityStoreGlobalStateOverrides,
  HistorySnapshotState,
  LogExtractionConfig,
} from './constants';
import { EntityStoreGlobalStateTypeName } from './types';
import { getLegacyLogExtractionOverrides } from './legacy_defaults';
import { retryOnConflict } from '../../../infra/elasticsearch';

// Read path: stored attributes in, full config out (missing fields get the current defaults).
const getWithLatestDefaults = (state?: EntityStoreGlobalStateOverrides): EntityStoreGlobalState => {
  const stored = state?.logsExtraction ?? {};
  const overrides =
    state?.defaultsVersion === 'latest' ? stored : getLegacyLogExtractionOverrides(stored);

  return EntityStoreGlobalState.parse({
    historySnapshot: HistorySnapshotState.parse(state?.historySnapshot ?? {}),
    logsExtraction: LogExtractionConfig.parse(overrides),
  });
};

export class EntityStoreGlobalStateClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async find(): Promise<EntityStoreGlobalState | undefined> {
    const raw = await this.findRaw();
    return raw === undefined ? undefined : getWithLatestDefaults(raw.attributes);
  }

  async findOrThrow(): Promise<EntityStoreGlobalState> {
    const response = await this.find();
    if (response === undefined) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(
        'No global state found for this namespace'
      );
    }
    return response;
  }

  async init(initialState?: EntityStoreGlobalStateOverrides): Promise<EntityStoreGlobalState> {
    const existing = await this.find();
    if (existing !== undefined) {
      return this.update(initialState ?? {});
    }

    const id = this.getSavedObjectId();
    this.logger.debug(`Creating global state with id ${id}`);

    const { attributes } = await this.soClient.create<EntityStoreGlobalStateOverrides>(
      EntityStoreGlobalStateTypeName,
      EntityStoreGlobalStateOverrides.parse({ ...initialState, defaultsVersion: 'latest' }),
      { id }
    );

    return getWithLatestDefaults(attributes);
  }

  async update(partial: EntityStoreGlobalStateOverrides): Promise<EntityStoreGlobalState> {
    // retries on version conflict, so concurrent writers
    // (e.g. the history snapshot task vs a config update) cannot overwrite each other
    return retryOnConflict(
      async () => {
        const raw = await this.findRaw();
        if (raw === undefined) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(
            'No global state found for this namespace'
          );
        }

        const storedLogsOverrides =
          raw.attributes.defaultsVersion === 'latest'
            ? raw.attributes.logsExtraction ?? {}
            : getLegacyLogExtractionOverrides(raw.attributes.logsExtraction ?? {});
        const existing = getWithLatestDefaults(raw.attributes);
        return this.replace(
          this.getSavedObjectId(),
          EntityStoreGlobalStateOverrides.parse({
            defaultsVersion: 'latest',
            historySnapshot: { ...existing.historySnapshot, ...partial.historySnapshot },
            logsExtraction: { ...storedLogsOverrides, ...partial.logsExtraction },
          }),
          raw.version
        );
      },
      { logger: this.logger }
    );
  }

  private async replace(
    id: string,
    overrides: EntityStoreGlobalStateOverrides,
    version?: string
  ): Promise<EntityStoreGlobalState> {
    const { attributes } = await this.soClient.update<EntityStoreGlobalStateOverrides>(
      EntityStoreGlobalStateTypeName,
      id,
      overrides,
      { refresh: 'wait_for', mergeAttributes: false, version }
    );

    return getWithLatestDefaults(attributes);
  }

  async delete(): Promise<void> {
    const response = await this.findSO();
    if (response.total === 0) {
      return;
    }

    try {
      const id = response.saved_objects[0].id;
      this.logger.debug(`Deleting global state with id ${id}`);
      await this.soClient.delete(EntityStoreGlobalStateTypeName, id);
    } catch (error) {
      if (Boom.isBoom(error, 404)) {
        return;
      }
      throw error;
    }
  }

  private getSavedObjectId(): string {
    return `${EntityStoreGlobalStateTypeName}-${this.namespace}`;
  }

  private async findRaw(): Promise<
    { attributes: EntityStoreGlobalStateOverrides; version?: string } | undefined
  > {
    const response = await this.findSO();
    if (response.total === 0) {
      return undefined;
    }

    const { attributes, version } = response.saved_objects[0];
    return { attributes, version };
  }

  private findSO(): Promise<SavedObjectsFindResponse<EntityStoreGlobalStateOverrides>> {
    return this.soClient.find<EntityStoreGlobalStateOverrides>({
      type: EntityStoreGlobalStateTypeName,
      namespaces: [this.namespace],
      perPage: 1,
    });
  }
}
