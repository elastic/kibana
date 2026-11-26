/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import {
  EntityStoreGlobalState,
  EntityStoreGlobalStateOverrides,
  HistorySnapshotState,
  LogExtractionConfig,
  type LogExtractionOverride,
} from './constants';
import { EntityStoreGlobalStateTypeName } from './types';
import { getLegacyLogExtractionOverrides } from './legacy_defaults';
import { retryOnConflict, type RetryOnConflictOptions } from '../../../infra/elasticsearch';
import { applyOverrides } from '../apply_overrides';

const getLogsExtractionOverrides = (attrs: EntityStoreGlobalStateOverrides) =>
  attrs.defaultsVersion === 'latest'
    ? attrs.logsExtraction ?? {}
    : getLegacyLogExtractionOverrides(attrs.logsExtraction ?? {});

/** Write-path partial for historySnapshot. `undefined` = leave alone; `null` = clear the field. */
export type HistorySnapshotUpdate = {
  [K in keyof HistorySnapshotState]?: HistorySnapshotState[K] | null;
};

/** Write-path input. Log extraction fields accept `null` to delete them. History snapshot fields use HistorySnapshotUpdate: omitted = unchanged, `null` = cleared. */
export type GlobalStateOverridesInput = Omit<
  EntityStoreGlobalStateOverrides,
  'logsExtraction' | 'historySnapshot'
> & {
  logsExtraction?: LogExtractionOverride;
  historySnapshot?: HistorySnapshotUpdate;
};

// takes existing config, strips legacy defaults (if exists) and merges with new overrides
const mergeOverrides = (
  raw: EntityStoreGlobalStateOverrides,
  overrides: GlobalStateOverridesInput
): EntityStoreGlobalStateOverrides =>
  EntityStoreGlobalStateOverrides.parse({
    defaultsVersion: 'latest',
    historySnapshot: applyOverrides<HistorySnapshotState>(
      HistorySnapshotState.parse(raw.historySnapshot ?? {}),
      overrides.historySnapshot
    ),
    logsExtraction: applyOverrides<Partial<LogExtractionConfig>>(
      getLogsExtractionOverrides(raw),
      overrides.logsExtraction
    ),
    excludedUserNames:
      overrides.excludedUserNames !== undefined
        ? overrides.excludedUserNames
        : raw.excludedUserNames,
  });

// Read path: stored attributes in, full config out (missing fields get the current defaults).
const getWithLatestDefaults = (state: EntityStoreGlobalStateOverrides): EntityStoreGlobalState =>
  EntityStoreGlobalState.parse({
    historySnapshot: HistorySnapshotState.parse(state.historySnapshot ?? {}),
    logsExtraction: LogExtractionConfig.parse(getLogsExtractionOverrides(state)),
    excludedUserNames: state.excludedUserNames ?? [],
  });

export class EntityStoreGlobalStateClient {
  /**
   * @param soClient Must be a namespace-scoped client (e.g. from `getScopedClient`
   * or `getUnsafeInternalClient().asScopedToNamespace(namespace)`). SO operations
   * do not pass an explicit `namespace` option — correctness relies on the client being pre-scoped
   * to the target space. Do not pass an internal/unscoped repository here.
   */
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

  /** Store-wide log extraction overrides without the code defaults applied. The layered merge needs this sparse view, not `find()`. */
  async findLogExtractionOverrides(): Promise<Partial<LogExtractionConfig>> {
    const raw = await this.findRaw();
    return raw === undefined ? {} : getLogsExtractionOverrides(raw.attributes);
  }

  async init(initialState?: GlobalStateOverridesInput): Promise<EntityStoreGlobalState> {
    const raw = await this.findRaw();
    if (raw !== undefined) {
      return this.update(initialState ?? {});
    }

    const id = this.getSavedObjectId();
    this.logger.debug(`Creating global state with id ${id}`);

    const { attributes } = await this.soClient.create<EntityStoreGlobalStateOverrides>(
      EntityStoreGlobalStateTypeName,
      EntityStoreGlobalStateOverrides.parse({
        ...initialState,
        logsExtraction: applyOverrides<Partial<LogExtractionConfig>>(
          {},
          initialState?.logsExtraction
        ),
        defaultsVersion: 'latest',
      }),
      { id }
    );

    return getWithLatestDefaults(attributes);
  }

  async update(
    overrides: GlobalStateOverridesInput,
    retryOpts?: RetryOnConflictOptions
  ): Promise<EntityStoreGlobalState> {
    // retries on version conflict, so concurrent writers
    // (e.g. the history snapshot task vs a config update) cannot overwrite each other
    return retryOnConflict(async () => {
      const raw = await this.findRaw();
      if (raw === undefined) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          'No global state found for this namespace'
        );
      }
      return this.replace(mergeOverrides(raw.attributes, overrides), raw.version);
    }, retryOpts);
  }

  private async replace(
    overrides: EntityStoreGlobalStateOverrides,
    version?: string
  ): Promise<EntityStoreGlobalState> {
    const { attributes } = await this.soClient.update<EntityStoreGlobalStateOverrides>(
      EntityStoreGlobalStateTypeName,
      this.getSavedObjectId(),
      overrides,
      { refresh: 'wait_for', mergeAttributes: false, version }
    );

    return getWithLatestDefaults(attributes);
  }

  async delete(): Promise<void> {
    const so = await this.getSO();
    if (so === undefined) {
      return;
    }

    try {
      this.logger.debug(`Deleting global state with id ${so.id}`);
      await this.soClient.delete(EntityStoreGlobalStateTypeName, so.id);
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
    const so = await this.getSO();
    if (so === undefined) {
      return undefined;
    }
    return { attributes: so.attributes, version: so.version };
  }

  private async getSO(): Promise<SavedObject<EntityStoreGlobalStateOverrides> | undefined> {
    try {
      return await this.soClient.get<EntityStoreGlobalStateOverrides>(
        EntityStoreGlobalStateTypeName,
        this.getSavedObjectId()
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }
}
