/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import {
  SavedObjectsFindResponse,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from '@kbn/core/server';
import {
  DATA_STREAM_REINDEX_OP_TYPE,
  DataStreamReindexOperation,
  ReindexOptions,
  DataStreamReindexSavedObject,
  ReindexStatus,
  DataStreamReindexStep,
} from '../../../common/types';

export const LOCK_WINDOW = moment.duration(90, 'seconds');

/**
 * A collection of utility functions pulled out out of the ReindexService to make testing simpler.
 * This is NOT intended to be used by any other code.
 */
export interface DataStreamReindexActions {
  /**
   * Creates a new reindexOp, does not perform any pre-flight checks.
   * @param indexName
   * @param opts Additional options when creating the reindex operation
   */
  createReindexOp(indexName: string, opts?: ReindexOptions): Promise<DataStreamReindexSavedObject>;

  /**
   * Deletes a reindexOp.
   * @param reindexOp
   */
  deleteReindexOp(reindexOp: DataStreamReindexSavedObject): void;

  /**
   * Updates a DataStreamReindexSavedObject.
   * @param reindexOp
   * @param attrs
   */
  updateReindexOp(
    reindexOp: DataStreamReindexSavedObject,
    attrs?: Partial<DataStreamReindexOperation>
  ): Promise<DataStreamReindexSavedObject>;

  /**
   * Runs a callback function while locking the reindex operation. Guaranteed to unlock the reindex operation when complete.
   * @param func A function to run with the locked ML lock document. Must return a promise that resolves
   * to the updated DataStreamReindexSavedObject.
   */
  runWhileLocked(
    reindexOp: DataStreamReindexSavedObject,
    func: (reindexOp: DataStreamReindexSavedObject) => Promise<DataStreamReindexSavedObject>
  ): Promise<DataStreamReindexSavedObject>;

  /**
   * Finds the reindex operation saved object for the given index.
   * @param indexName
   */
  findReindexOperations(
    indexName: string
  ): Promise<SavedObjectsFindResponse<DataStreamReindexOperation>>;

  /**
   * Returns an array of all reindex operations that have a status.
   */
  findAllByStatus(status: ReindexStatus): Promise<DataStreamReindexSavedObject[]>;
}

export const dataStreamReindexActionsFactory = (
  client: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): DataStreamReindexActions => {
  // ----- Internal functions
  const isLocked = (reindexOp: DataStreamReindexSavedObject) => {
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

  const acquireLock = async (reindexOp: DataStreamReindexSavedObject) => {
    if (isLocked(reindexOp)) {
      throw new Error(`Another Kibana process is currently modifying this reindex operation.`);
    }

    return client.update<DataStreamReindexOperation>(
      DATA_STREAM_REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: moment().format() },
      { version: reindexOp.version }
    ) as Promise<DataStreamReindexSavedObject>;
  };

  const releaseLock = (reindexOp: DataStreamReindexSavedObject) => {
    return client.update<DataStreamReindexOperation>(
      DATA_STREAM_REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: null },
      { version: reindexOp.version }
    ) as Promise<DataStreamReindexSavedObject>;
  };

  // ----- Public interface
  return {
    async createReindexOp(indexName: string) {
      return client.create<DataStreamReindexOperation>(DATA_STREAM_REINDEX_OP_TYPE, {
        indexName,
        status: ReindexStatus.inProgress,
        lastCompletedStep: DataStreamReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        // Queue the reindex operation
        reindexOptions: { queueSettings: { queuedAt: +new Date() } },
      });
    },

    deleteReindexOp(reindexOp: DataStreamReindexSavedObject) {
      return client.delete(DATA_STREAM_REINDEX_OP_TYPE, reindexOp.id);
    },

    async updateReindexOp(
      reindexOp: DataStreamReindexSavedObject,
      attrs: Partial<DataStreamReindexOperation> = {}
    ) {
      if (!isLocked(reindexOp)) {
        throw new Error(`DataStreamReindexOperation must be locked before updating.`);
      }

      const newAttrs = { ...reindexOp.attributes, locked: moment().format(), ...attrs };
      return client.update<DataStreamReindexOperation>(
        DATA_STREAM_REINDEX_OP_TYPE,
        reindexOp.id,
        newAttrs,
        {
          version: reindexOp.version,
        }
      ) as Promise<DataStreamReindexSavedObject>;
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
      return client.find<DataStreamReindexOperation>({
        type: DATA_STREAM_REINDEX_OP_TYPE,
        search: `"${indexName}"`,
        searchFields: ['indexName'],
      });
    },

    async findAllByStatus(status: ReindexStatus) {
      const firstPage = await client.find<DataStreamReindexOperation>({
        type: DATA_STREAM_REINDEX_OP_TYPE,
        search: status.toString(),
        searchFields: ['status'],
      });

      if (firstPage.total === firstPage.saved_objects.length) {
        return firstPage.saved_objects;
      }

      let allOps = firstPage.saved_objects;
      let page = firstPage.page + 1;

      while (allOps.length < firstPage.total) {
        const nextPage = await client.find<DataStreamReindexOperation>({
          type: DATA_STREAM_REINDEX_OP_TYPE,
          search: status.toString(),
          searchFields: ['status'],
          page,
        });

        allOps = [...allOps, ...nextPage.saved_objects];
        page++;
      }

      return allOps;
    },
  };
};
