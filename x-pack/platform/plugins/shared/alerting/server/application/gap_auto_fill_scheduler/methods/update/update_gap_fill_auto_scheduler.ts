/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { UpdateGapFillAutoSchedulerParams } from './types';
import type { GapFillAutoSchedulerResponse } from '../../result/types';
import { updateGapFillAutoSchedulerSchema } from './schemas';
import type { GapAutoFillSchedulerSavedObjectAttributes } from '../../transforms';
import {
  transformGapAutoFillSchedulerUpdateParams,
  transformSavedObjectToGapAutoFillSchedulerResult,
} from '../../transforms';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';

export async function updateGapFillAutoScheduler(
  context: RulesClientContext,
  params: { id: string; updates: UpdateGapFillAutoSchedulerParams }
): Promise<GapFillAutoSchedulerResponse> {
  try {
    // Validate input parameters
    updateGapFillAutoSchedulerSchema.validate(params.updates);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler update parameters "${JSON.stringify(
        params.updates
      )}" - ${error.message}`
    );
  }

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;
  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');

  try {
    // Get the existing saved object first
    const so = await soClient.get<GapAutoFillSchedulerSavedObjectAttributes>(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    // Check for errors in the savedObjectClient result
    if (so.error) {
      const err = new Error(so.error.message);
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.UPDATE,
          savedObject: {
            type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: so.attributes.name,
          },
          error: new Error(so.error.message),
        })
      );
      throw err;
    }

    // Authorization check - we need to check if user has permission to update
    // For gap fill auto scheduler, we check against the rule types it manages
    const ruleTypes = so.attributes.ruleTypes || [];
    try {
      for (const ruleType of ruleTypes) {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType.type,
          consumer: ruleType.consumer,
          operation: WriteOperations.UpdateGapFillAutoScheduler,
          entity: AlertingAuthorizationEntity.Rule,
        });
      }
    } catch (error) {
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.UPDATE,
          savedObject: {
            type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: so.attributes.name,
          },
          error,
        })
      );
      throw error;
    }

    const scheduledTaskId: string | undefined = so.attributes.scheduledTaskId;
    const { enabled, schedule } = params.updates;

    // Get current user for audit trail
    const updatedBy = await context.getUserName?.();

    // Transform update parameters to saved object attributes
    const updatedAttrs = transformGapAutoFillSchedulerUpdateParams(params.updates, updatedBy);

    // Update the saved object
    const updatedSo = await soClient.update<GapAutoFillSchedulerSavedObjectAttributes>(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id,
      updatedAttrs
    );

    // Handle task manager updates if there's a scheduled task and values actually changed
    if (scheduledTaskId) {
      // Only enable/disable if the enabled value actually changed
      if (enabled !== undefined && enabled !== so.attributes.enabled) {
        if (enabled) {
          await taskManager.bulkEnable([scheduledTaskId]);
        } else {
          await taskManager.bulkDisable([scheduledTaskId]);
        }
      }

      // Only update schedule if the schedule actually changed
      if (schedule !== undefined && !isEqual(schedule, so.attributes.schedule)) {
        await taskManager.bulkUpdateSchedules([scheduledTaskId], schedule);
      }
    }

    // Log successful update
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.UPDATE,
        savedObject: {
          type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: updatedSo.attributes.name,
        },
      })
    );

    // Transform the saved object to the result format
    return transformSavedObjectToGapAutoFillSchedulerResult({
      savedObject: updatedSo as SavedObject<GapAutoFillSchedulerSavedObjectAttributes>,
    });
  } catch (err) {
    const errorMessage = `Failed to update gap fill auto scheduler by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
