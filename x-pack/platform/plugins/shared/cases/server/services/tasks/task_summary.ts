/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_TASK_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { createCaseError } from '../../common/error';

interface TaskStatusCounts {
  open: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

/**
 * Recomputes the task_summary for a case by aggregating task statuses and
 * finding the earliest uncompleted due date, then writes it back to the
 * case SavedObject. Called after every task mutation.
 *
 * Uses optimistic concurrency: if the case has been updated concurrently,
 * the write is retried once.
 */
export const syncTaskSummary = async ({
  caseId,
  unsecuredSavedObjectsClient,
  logger,
}: {
  caseId: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<void> => {
  try {
    const summary = await computeTaskSummary({ caseId, unsecuredSavedObjectsClient });

    // Fetch the current case to get its version for optimistic concurrency
    const caseObj = await unsecuredSavedObjectsClient.get(CASE_SAVED_OBJECT, caseId);

    try {
      await unsecuredSavedObjectsClient.update(
        CASE_SAVED_OBJECT,
        caseId,
        { task_summary: summary },
        { version: caseObj.version }
      );
    } catch (conflictError) {
      // On version conflict, retry once without version check
      if (conflictError?.output?.statusCode === 409) {
        logger.debug(`task_summary sync conflict on case ${caseId}, retrying`);
        await unsecuredSavedObjectsClient.update(CASE_SAVED_OBJECT, caseId, {
          task_summary: summary,
        });
      } else {
        throw conflictError;
      }
    }
  } catch (error) {
    throw createCaseError({
      message: `Failed to sync task_summary for case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Loads all tasks for a case and computes the summary object.
 */
const computeTaskSummary = async ({
  caseId,
  unsecuredSavedObjectsClient,
}: {
  caseId: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}): Promise<{
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  next_due_date: string | null;
}> => {
  // Fetch all tasks for this case in a single query (up to 10k)
  const result = await unsecuredSavedObjectsClient.find<{
    status: string;
    due_date: string | null;
  }>({
    type: CASE_TASK_SAVED_OBJECT,
    filter: nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.case_id`, caseId),
    fields: ['status', 'due_date'],
    page: 1,
    perPage: 10000,
  });

  const counts: TaskStatusCounts = { open: 0, in_progress: 0, completed: 0, cancelled: 0 };
  const pendingDueDates: string[] = [];

  for (const task of result.saved_objects) {
    const { status, due_date } = task.attributes;

    if (status === 'open') counts.open++;
    else if (status === 'in_progress') counts.in_progress++;
    else if (status === 'completed') counts.completed++;
    else if (status === 'cancelled') counts.cancelled++;

    // Collect due dates for incomplete tasks only
    if (due_date && status !== 'completed' && status !== 'cancelled') {
      pendingDueDates.push(due_date);
    }
  }

  const next_due_date =
    pendingDueDates.length > 0
      ? pendingDueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
      : null;

  return {
    total: result.total,
    open: counts.open,
    in_progress: counts.in_progress,
    completed: counts.completed,
    cancelled: counts.cancelled,
    next_due_date: next_due_date ?? null,
  };
};
