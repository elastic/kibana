/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow } from 'fp-ts/lib/function';
import { Logger } from '@kbn/core/server';
import { DataStreamReindexSavedObject, ReindexSavedObject } from '../../../common/types';

export type SupportedReindexSavedObject = ReindexSavedObject | DataStreamReindexSavedObject;

export interface SortedReindexSavedObjects {
  /**
   * Reindex objects sorted into this array represent Elasticsearch reindex tasks that
   * have no inherent order and are considered to be processed in parallel.
   */
  parallel: SupportedReindexSavedObject[];

  /**
   * Reindex objects sorted into this array represent Elasticsearch reindex tasks that
   * are consistently ordered (see {@link orderQueuedReindexOperations}) and should be
   * processed in order.
   */
  queue: SupportedReindexSavedObject[];
}

const sortReindexOperations = (ops: SupportedReindexSavedObject[]): SortedReindexSavedObjects => {
  const parallel: SupportedReindexSavedObject[] = [];
  const queue: SupportedReindexSavedObject[] = [];
  for (const op of ops) {
    if (op.attributes.reindexOptions?.queueSettings) {
      queue.push(op);
    } else {
      parallel.push(op);
    }
  }

  return {
    parallel,
    queue,
  };
};
const orderQueuedReindexOperations = ({
  parallel,
  queue,
}: SortedReindexSavedObjects): SortedReindexSavedObjects => ({
  parallel,
  // Sort asc
  queue: queue.sort(
    (a, b) =>
      a.attributes.reindexOptions!.queueSettings!.queuedAt -
      b.attributes.reindexOptions!.queueSettings!.queuedAt
  ),
});

export const isQueuedOp = (op: SupportedReindexSavedObject) =>
  Boolean(op.attributes.reindexOptions?.queueSettings);

export const queuedOpHasStarted = (op: SupportedReindexSavedObject) =>
  Boolean(op.attributes.reindexOptions?.queueSettings?.startedAt);

export const sortAndOrderReindexOperations = flow(
  sortReindexOperations,
  orderQueuedReindexOperations
);

/**
 * Swallows any exceptions that may occur during the reindex process. This prevents any errors from
 * stopping the worker from continuing to process more jobs.
 */
export const swallowExceptions =
  <SavedObject extends SupportedReindexSavedObject>(
    func: (reindexOp: SavedObject) => Promise<SavedObject>,
    log: Logger
  ) =>
  async (reindexOp: SavedObject) => {
    try {
      return await func(reindexOp);
    } catch (e) {
      if (reindexOp.attributes.locked) {
        log.debug(`Skipping reindexOp with unexpired lock: ${reindexOp.id}`);
      } else {
        log.warn(`Error when trying to process reindexOp (${reindexOp.id}): ${e.toString()}`);
      }

      return reindexOp;
    }
  };
