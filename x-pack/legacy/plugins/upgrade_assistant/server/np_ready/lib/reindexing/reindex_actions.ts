/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsFindResponse, SavedObjectsClientContract } from 'kibana/server';
import {
  IndexGroup,
  REINDEX_OP_TYPE,
  ReindexOperation,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from '../../../../common/types';
import { generateNewIndexName } from './index_settings';
import { FlatSettings, FlatSettingsWithTypeName } from './types';

// TODO: base on elasticsearch.requestTimeout?
export const LOCK_WINDOW = moment.duration(90, 'seconds');

/**
 * A collection of utility functions pulled out out of the ReindexService to make testing simpler.
 * This is NOT intended to be used by any other code.
 */
export interface ReindexActions {
  /**
   * Namespace for ML-specific actions.
   */
  // ml: MlActions;

  /**
   * Creates a new reindexOp, does not perform any pre-flight checks.
   * @param indexName
   */
  createReindexOp(indexName: string): Promise<ReindexSavedObject>;

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

  /**
   * Retrieve index settings (in flat, dot-notation style) and mappings with the type name included.
   * @param indexName
   */
  getFlatSettingsWithTypeName(indexName: string): Promise<FlatSettingsWithTypeName | null>;

  // ----- Functions below are for enforcing locks around groups of indices like ML or Watcher

  /**
   * Atomically increments the number of reindex operations running for an index group.
   */
  incrementIndexGroupReindexes(group: IndexGroup): Promise<void>;

  /**
   * Atomically decrements the number of reindex operations running for an index group.
   */
  decrementIndexGroupReindexes(group: IndexGroup): Promise<void>;

  /**
   * Runs a callback function while locking an index group.
   * @param func A function to run with the locked index group lock document. Must return a promise that resolves
   * to the updated ReindexSavedObject.
   */
  runWhileIndexGroupLocked(
    group: IndexGroup,
    func: (lockDoc: ReindexSavedObject) => Promise<ReindexSavedObject>
  ): Promise<void>;

  /**
   * Exposed only for testing, DO NOT USE.
   */
  _fetchAndLockIndexGroupDoc(group: IndexGroup): Promise<ReindexSavedObject>;
}

export const reindexActionsFactory = (
  client: SavedObjectsClientContract,
  callCluster: CallCluster
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
    async createReindexOp(indexName: string) {
      return client.create<ReindexOperation>(REINDEX_OP_TYPE, {
        indexName,
        newIndexName: generateNewIndexName(indexName),
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
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
      const flatSettings = (await callCluster('transport.request', {
        path: `/${encodeURIComponent(indexName)}?flat_settings=true&include_type_name=false`,
      })) as { [indexName: string]: FlatSettings };

      if (!flatSettings[indexName]) {
        return null;
      }

      return flatSettings[indexName];
    },

    async getFlatSettingsWithTypeName(indexName: string) {
      const flatSettings = (await callCluster('transport.request', {
        path: `/${encodeURIComponent(indexName)}?flat_settings=true&include_type_name=true`,
      })) as { [indexName: string]: FlatSettingsWithTypeName };

      if (!flatSettings[indexName]) {
        return null;
      }

      return flatSettings[indexName];
    },

    async _fetchAndLockIndexGroupDoc(indexGroup) {
      const fetchDoc = async () => {
        try {
          // The IndexGroup enum value (a string) serves as the ID of the lock doc
          return await client.get<ReindexOperation>(REINDEX_OP_TYPE, indexGroup);
        } catch (e) {
          if (e.isBoom && e.output.statusCode === 404) {
            return await client.create<ReindexOperation>(
              REINDEX_OP_TYPE,
              {
                indexName: null,
                newIndexName: null,
                locked: null,
                status: null,
                lastCompletedStep: null,
                reindexTaskId: null,
                reindexTaskPercComplete: null,
                errorMessage: null,
                runningReindexCount: 0,
              } as any,
              { id: indexGroup }
            );
          } else {
            throw e;
          }
        }
      };

      const lockDoc = async (attempt = 1): Promise<ReindexSavedObject> => {
        try {
          // Refetch the document each time to avoid version conflicts.
          return await acquireLock(await fetchDoc());
        } catch (e) {
          if (attempt >= 10) {
            throw new Error(`Could not acquire lock for ML jobs`);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          return lockDoc(attempt + 1);
        }
      };

      return lockDoc();
    },

    async incrementIndexGroupReindexes(indexGroup) {
      this.runWhileIndexGroupLocked(indexGroup, lockDoc =>
        this.updateReindexOp(lockDoc, {
          runningReindexCount: lockDoc.attributes.runningReindexCount! + 1,
        })
      );
    },

    async decrementIndexGroupReindexes(indexGroup) {
      this.runWhileIndexGroupLocked(indexGroup, lockDoc =>
        this.updateReindexOp(lockDoc, {
          runningReindexCount: lockDoc.attributes.runningReindexCount! - 1,
        })
      );
    },

    async runWhileIndexGroupLocked(indexGroup, func) {
      let lockDoc = await this._fetchAndLockIndexGroupDoc(indexGroup);

      try {
        lockDoc = await func(lockDoc);
      } finally {
        await releaseLock(lockDoc);
      }
    },
  };
};
