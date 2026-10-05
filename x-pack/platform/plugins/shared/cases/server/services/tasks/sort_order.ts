/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_TASK_SAVED_OBJECT, MAX_TASKS_PER_CASE } from '../../../common/constants';

/** Gap between consecutive sort_order values so a task can be inserted without rewriting siblings. */
export const SORT_ORDER_GAP = 1000;

const ATTR = `${CASE_TASK_SAVED_OBJECT}.attributes`;

/** Next sort_order among the siblings of a case (root tasks or children of one parent). */
export const getNextSortOrder = async ({
  caseId,
  parentTaskId,
  unsecuredSavedObjectsClient,
}: {
  caseId: string;
  parentTaskId: string | null;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}): Promise<number> => {
  const filters = [nodeBuilder.is(`${ATTR}.case_id`, caseId)];
  if (parentTaskId !== null) {
    filters.push(nodeBuilder.is(`${ATTR}.parent_task_id`, parentTaskId));
  }

  const result = await unsecuredSavedObjectsClient.find<{
    sort_order: number;
    parent_task_id: string | null;
  }>({
    type: CASE_TASK_SAVED_OBJECT,
    filter: nodeBuilder.and(filters),
    sortField: 'sort_order',
    sortOrder: 'desc',
    perPage: parentTaskId === null ? MAX_TASKS_PER_CASE : 1,
    fields: ['sort_order', 'parent_task_id'],
  });

  // KQL cannot express "field is missing", so root siblings are picked out here.
  const siblings =
    parentTaskId === null
      ? result.saved_objects.filter((so) => so.attributes.parent_task_id == null)
      : result.saved_objects;

  return (siblings[0]?.attributes.sort_order ?? 0) + SORT_ORDER_GAP;
};

export const computeReorderedSortOrders = (orderedTaskIds: string[]) =>
  orderedTaskIds.map((id, index) => ({ id, sort_order: (index + 1) * SORT_ORDER_GAP }));
