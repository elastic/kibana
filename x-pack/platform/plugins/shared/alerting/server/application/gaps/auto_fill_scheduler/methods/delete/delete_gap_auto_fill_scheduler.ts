/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../../rules_client/types';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../../saved_objects';
import { WriteOperations } from '../../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../../rules_client/common/audit_events';
import { getGapAutoFillSchedulerSchema } from '../schemas';
import type { GetGapAutoFillSchedulerParams } from '../types';
import { getGapAutoFillSchedulerSO } from '../utils';

export async function deleteGapAutoFillScheduler(
  context: RulesClientContext,
  params: GetGapAutoFillSchedulerParams
): Promise<void> {
  try {
    getGapAutoFillSchedulerSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler delete parameters "${JSON.stringify(params)}" - ${
        (error as Error).message
      }`
    );
  }

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;

  try {
    const schedulerSo = await getGapAutoFillSchedulerSO({
      context,
      id: params.id,
      operation: WriteOperations.DeleteGapAutoFillScheduler,
      authAuditAction: GapAutoFillSchedulerAuditAction.DELETE,
    });

    const schedulerName = schedulerSo.attributes.name;

    const scheduledTaskId = schedulerSo.id;

    try {
      await taskManager.removeIfExists(scheduledTaskId);
    } catch (err) {
      const errorMessage = `Unable to remove gap auto fill scheduler task for id: ${params.id}. Backfills and saved object will not be deleted.`;
      context.logger.error(`${errorMessage} - ${err}`);
      throw err;
    }

    try {
      await context.backfillClient.deleteBackfillsByInitiatorId({
        initiatorId: scheduledTaskId,
        unsecuredSavedObjectsClient: soClient,
        shouldUpdateGaps: true,
        internalSavedObjectsRepository: context.internalSavedObjectsRepository,
        eventLogClient: await context.getEventLogClient(),
        eventLogger: context.eventLogger,
        actionsClient: await context.getActionsClient(),
      });
    } catch (err) {
      const errorMessage = `Unable to delete backfills for gap auto fill scheduler id: ${params.id}. Saved object will not be deleted.`;
      context.logger.error(`${errorMessage} - ${err}`);
      throw err;
    }

    try {
      await soClient.delete(GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE, params.id);
    } catch (err) {
      const errorMessage = `Unable to delete gap auto fill scheduler saved object for id: ${params.id}`;
      context.logger.error(`${errorMessage} - ${err}`);
      throw err;
    }

    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.DELETE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: schedulerName,
        },
      })
    );
  } catch (err) {
    const errorMessage = `Failed to delete gap auto fill scheduler by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err as Error, { message: errorMessage });
  }
}
