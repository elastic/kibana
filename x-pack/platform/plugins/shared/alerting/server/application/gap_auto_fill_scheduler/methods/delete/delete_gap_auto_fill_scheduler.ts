/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { getGapAutoFillSchedulerSchema } from '../get/schemas';
import type { GetGapAutoFillSchedulerParams } from '../get/types';

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
    const schedulerSo = await soClient.get<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    const schedulerName = schedulerSo.attributes?.name ?? params.id;
    const ruleTypes = schedulerSo.attributes?.ruleTypes ?? [];
    try {
      for (const ruleType of ruleTypes) {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType.type,
          consumer: ruleType.consumer,
          operation: WriteOperations.DeleteGapAutoFillScheduler,
          entity: AlertingAuthorizationEntity.Rule,
        });
      }
    } catch (authError) {
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.DELETE,
          savedObject: {
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: schedulerName,
          },
          error: authError as Error,
        })
      );
      throw authError;
    }

    const scheduledTaskId = schedulerSo.id;

    await taskManager.removeIfExists(scheduledTaskId);

    await soClient.delete(GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE, params.id);

    await context.backfillClient.deleteBackfillsByInitiatorId({
      initiatorId: scheduledTaskId,
      unsecuredSavedObjectsClient: soClient,
      shouldUpdateGaps: true,
      internalSavedObjectsRepository: context.internalSavedObjectsRepository,
      eventLogClient: await context.getEventLogClient(),
      eventLogger: context.eventLogger,
      actionsClient: await context.getActionsClient(),
    });

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
