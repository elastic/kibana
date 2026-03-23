/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type {
  SavedObjectsFindResponse,
  SavedObjectsClientContract,
  ElasticsearchClient,
  Logger,
} from '@kbn/core/server';
import { REINDEX_OP_TYPE } from '@kbn/upgrade-assistant-pkg-server';
import type { FlatSettings, GetRollupJobByIndexNameType } from '@kbn/upgrade-assistant-pkg-server';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import type { ReindexArgs, ReindexOptions, ReindexOperation } from '../../../common';
import type { ReindexSavedObject } from './types';
import { ReindexStep } from '../../../common';

// TODO: base on elasticsearch.requestTimeout?
export const LOCK_WINDOW = moment.duration(90, 'seconds');

export type CreateReindexOpArgs = Omit<ReindexArgs, 'reindexOptions'> & {
  reindexOptions?: ReindexOptions;
};

/**
 * A collection of utility functions pulled out out of the ReindexService to make testing simpler.
 * This is NOT intended to be used by any other code.
 */
export interface ReindexActions {
  /**
   * Creates a new reindexOp, does not perform any pre-flight checks.
   * @param indexName
   * @param opts Additional options when creating the reindex operation
   */
  createReindexOp({
    indexName,
    newIndexName,
    settings,
    reindexOptions,
  }: CreateReindexOpArgs): Promise<ReindexSavedObject>;

  /**
   * Deletes a reindexOp.
   * @param reindexOp
   */
  deleteReindexOp(reindexOp: ReindexSavedObject): void;

  /**
   * Updates a ReindexSavedObject.
   * @param reindexOp
   * @param attrs
   */
  updateReindexOp(
    reindexOp: ReindexSavedObject,
    attrs?: Partial<ReindexOperation>
  ): Promise<ReindexSavedObject>;

  /**
   * Runs a callback function while locking the reindex operation. Guaranteed to unlock the reindex operation when complete.
   * @param func A function to run with the locked ML lock document. Must return a promise that resolves
   * to the updated ReindexSavedObject.
   */
  runWhileLocked(
    reindexOp: ReindexSavedObject,
    func: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>
  ): Promise<ReindexSavedObject>;

  /**
   * Finds the reindex operation saved object for the given index.
   * @param indexName
   */
  findReindexOperations(indexName: string): Promise<SavedObjectsFindResponse<ReindexOperation>>;

  /**
   * Returns an array of all reindex operations that have a status.
   */
  findAllByStatus(status: ReindexStatus): Promise<ReindexSavedObject[]>;

  /**
   * Retrieve index settings (in flat, dot-notation style) and mappings.
   * @param indexName
   */
  getFlatSettings(indexName: string): Promise<FlatSettings | null>;
}

export const reindexActionsFactory = (
  client: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  log: Logger,
  getRollupJobByIndexName: GetRollupJobByIndexNameType,
  rollupsEnabled: boolean
): ReindexActions => {
  // ----- Internal functions
  const isLocked = (reindexOp: ReindexSavedObject) => {
    if (reindexOp.attributes.locked) {
      const now = moment();
      const lockedTime = moment(reindexOp.attributes.locked);
      // If the object has been locked for more than the LOCK_WINDOW, assume the process that locked it died.
      if (now.subtract(LOCK_WINDOW) < lockedTime) {
        return true;
      }
    }

    return false;
  };

  const acquireLock = async (reindexOp: ReindexSavedObject) => {
    if (isLocked(reindexOp)) {
      throw new Error(`Another Kibana process is currently modifying this reindex operation.`);
    }

    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: moment().format() },
      { version: reindexOp.version }
    ) as Promise<ReindexSavedObject>;
  };

  const releaseLock = (reindexOp: ReindexSavedObject) => {
    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: null },
      { version: reindexOp.version }
    ) as Promise<ReindexSavedObject>;
  };

  // ----- Public interface
  return {
    async createReindexOp({
      indexName,
      newIndexName,
      reindexOptions,
      settings: indexSettings,
    }: Omit<ReindexArgs, 'reindexOptions'> & {
      reindexOptions?: ReindexOptions;
    }): Promise<ReindexSavedObject> {
      // gets rollup job if it exists and needs stopping, otherwise returns undefined
      let rollupJob: string | undefined;
      if (rollupsEnabled) {
        rollupJob = await getRollupJobByIndexName(esClient, log, indexName);
      }

      const settings = indexSettings ? JSON.stringify(indexSettings) : undefined;

      return client.create<ReindexOperation>(REINDEX_OP_TYPE, {
        indexName,
        newIndexName,
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
        reindexOptions,
        rollupJob,
        settings,
      });
    },

    deleteReindexOp(reindexOp: ReindexSavedObject) {
      return client.delete(REINDEX_OP_TYPE, reindexOp.id);
    },

    async updateReindexOp(reindexOp: ReindexSavedObject, attrs: Partial<ReindexOperation> = {}) {
      if (!isLocked(reindexOp)) {
        throw new Error(`ReindexOperation must be locked before updating.`);
      }

      const newAttrs = { ...reindexOp.attributes, locked: moment().format(), ...attrs };
      return client.update<ReindexOperation>(REINDEX_OP_TYPE, reindexOp.id, newAttrs, {
        version: reindexOp.version,
      }) as Promise<ReindexSavedObject>;
    },

    async runWhileLocked(reindexOp, func) {
      reindexOp = await acquireLock(reindexOp);

      try {
        reindexOp = await func(reindexOp);
      } finally {
        reindexOp = await releaseLock(reindexOp);
      }

      return reindexOp;
    },

    findReindexOperations(indexName: string) {
      return client.find<ReindexOperation>({
        type: REINDEX_OP_TYPE,
        search: `"${indexName}"`,
        searchFields: ['indexName'],
      });
    },

    async findAllByStatus(status: ReindexStatus) {
      const firstPage = await client.find<ReindexOperation>({
        type: REINDEX_OP_TYPE,
        search: status.toString(),
        searchFields: ['status'],
      });

      if (firstPage.total === firstPage.saved_objects.length) {
        return firstPage.saved_objects;
      }

      let allOps = firstPage.saved_objects;
      let page = firstPage.page + 1;

      while (allOps.length < firstPage.total) {
        const nextPage = await client.find<ReindexOperation>({
          type: REINDEX_OP_TYPE,
          search: status.toString(),
          searchFields: ['status'],
          page,
        });

        allOps = [...allOps, ...nextPage.saved_objects];
        page++;
      }

      return allOps;
    },

    async getFlatSettings(indexName: string) {
      const flatSettings = await esClient.indices.get({
        index: indexName,
        flat_settings: true,
      });

      if (!flatSettings[indexName]) {
        return null;
      }

      return flatSettings[indexName];
    },
  };
};
