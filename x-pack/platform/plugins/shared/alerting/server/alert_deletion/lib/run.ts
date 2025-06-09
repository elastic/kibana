/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { AlertDeletionContext } from '../alert_deletion_client';
import { deleteAlertsForSpace, logFailedDeletion, logSuccessfulDeletion } from '.';

export const runTask = async (
  context: AlertDeletionContext,
  taskInstance: ConcreteTaskInstance,
  abortController: AbortController
) => {
  const runDate = new Date();
  try {
    const settings = taskInstance.params.settings;
    const spaceIds = taskInstance.params.spaceIds;

    if (!spaceIds || spaceIds.length === 0 || !settings) {
      throw new Error(`Invalid task parameters: ${JSON.stringify(taskInstance.params)}`);
    }

    for (const spaceId of spaceIds) {
      try {
        const { numAlertsDeleted, errors } = await deleteAlertsForSpace(
          context,
          settings,
          spaceId,
          abortController
        );

        if (errors && errors.length > 0) {
          logFailedDeletion(context, runDate, numAlertsDeleted, [spaceId], errors?.join(', '));
        } else {
          logSuccessfulDeletion(context, runDate, numAlertsDeleted, [spaceId]);
        }
      } catch (err) {
        logFailedDeletion(context, runDate, 0, taskInstance.params.spaceIds, err.message);
      }
    }
  } catch (err) {
    context.logger.error(`Error encountered while running alert deletion task: ${err.message}`, {
      error: { stack_trace: err.stack },
    });

    logFailedDeletion(context, runDate, 0, taskInstance.params.spaceIds, err.message);
  }
};
