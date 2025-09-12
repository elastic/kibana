/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { CreateGapFillAutoSchedulerParams } from './types';
import type { GapFillAutoSchedulerResponse } from '../../result/types';
import { createGapFillAutoSchedulerSchema } from './schemas';
import { transformGapAutoFillSchedulerCreateParamToSavedObject } from './transforms/transform_gap_auto_fill_scheduler_param_to_saved_object';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_fill_auto_scheduler/types/gap_fill_auto_scheduler';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';

export async function createGapFillAutoScheduler(
  context: RulesClientContext,
  params: CreateGapFillAutoSchedulerParams
): Promise<GapFillAutoSchedulerResponse> {
  try {
    createGapFillAutoSchedulerSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler parameters "${JSON.stringify(params)}" - ${
        error.message
      }`
    );
  }

  try {
    for (const ruleType of params.ruleTypes) {
      await context.authorization.ensureAuthorized({
        ruleTypeId: ruleType.type,
        consumer: ruleType.consumer,
        operation: WriteOperations.CreateGapFillAutoScheduler,
        entity: AlertingAuthorizationEntity.Rule,
      });
    }
  } catch (error) {
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.CREATE,
        error,
      })
    );
    throw error;
  }

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;

  const createdBy = await context.getUserName?.();

  const now = new Date().toISOString();
  const attributes = transformGapAutoFillSchedulerCreateParamToSavedObject(params, {
    createdBy,
    createdAt: now,
    updatedAt: now,
    updatedBy: createdBy,
  });

  const savedObjectOptions = params.id ? { id: params.id } : {};

  const so = await soClient.create(
    GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
    attributes,
    savedObjectOptions
  );

  const task = await taskManager.ensureScheduled(
    {
      id: so.id,
      // TODO: use a constant for the task type
      taskType: 'gap-fill-auto-scheduler-task',
      schedule: params.schedule,
      scope: params.scope ?? [],
      params: {
        configId: so.id,
        spaceId: context.spaceId,
      },
      state: {},
    },
    {
      request: params.request,
    }
  );

  // Update the saved object with the scheduled task ID
  await soClient.update<GapAutoFillSchedulerSO>(GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE, so.id, {
    scheduledTaskId: task.id,
    updatedAt: new Date().toISOString(),
  });

  const updatedSo = await soClient.get<GapAutoFillSchedulerSO>(
    GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
    so.id
  );

  // Log successful creation
  context.auditLogger?.log(
    gapAutoFillSchedulerAuditEvent({
      action: GapAutoFillSchedulerAuditAction.CREATE,
      savedObject: {
        type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
        id: updatedSo.id,
        name: updatedSo.attributes.name,
      },
    })
  );

  // Transform the saved object to the result format
  return transformSavedObjectToGapAutoFillSchedulerResult({
    savedObject: updatedSo,
  });
}
