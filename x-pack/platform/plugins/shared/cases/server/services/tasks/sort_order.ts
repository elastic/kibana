/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { CASE_TASK_SAVED_OBJECT } from '../../../common/constants';
import { nodeBuilder } from '@kbn/es-query';

export const SORT_ORDER_GAP = 1000;

/**
 * Returns the next sort_order value for a new task within a parent scope
 * (caseId + parentTaskId). Uses a gap of SORT_ORDER_GAP to allow future
 * insertions without rewriting all existing orders.
 */
export const getNextSortOrder = async ({
  caseId,
  parentTaskId,
  unsecuredSavedObjectsClient,
  logger,
}: {
  caseId: string;
  parentTaskId: string | null;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<number> => {
  try {
    const filters = [nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.case_id`, caseId)];

    if (parentTaskId === null) {
      filters.push(
        nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.parent_task_id`, '__null__')
      );
    } else {
      filters.push(
        nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.parent_task_id`, parentTaskId)
      );
    }

    const result = await unsecuredSavedObjectsClient.find<{ sort_order: number }>({
      type: CASE_TASK_SAVED_OBJECT,
      filter: nodeBuilder.and(filters),
      sortField: 'sort_order',
      sortOrder: 'desc',
      page: 1,
      perPage: 1,
      fields: ['sort_order'],
    });

    if (result.total === 0) {
      return SORT_ORDER_GAP;
    }

    const maxOrder = result.saved_objects[0]?.attributes?.sort_order ?? 0;
    return maxOrder + SORT_ORDER_GAP;
  } catch (error) {
    logger.warn(`Failed to compute next sort_order for case ${caseId}: ${error.message}`);
    return SORT_ORDER_GAP;
  }
};

/**
 * Reassigns sort_order values across an ordered set of task IDs with gaps of
 * SORT_ORDER_GAP starting from SORT_ORDER_GAP. Used by reorderTasks.
 * Returns an array of { id, sort_order } ready for bulkUpdate.
 */
export const computeReorderedSortOrders = (
  orderedTaskIds: string[]
): Array<{ id: string; sort_order: number }> =>
  orderedTaskIds.map((id, index) => ({
    id,
    sort_order: (index + 1) * SORT_ORDER_GAP,
  }));
