/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsCreateOptions } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { CreateGapAutoFillSchedulerParams } from './types';
import type { GapAutoFillSchedulerResponse } from '../../result/types';
import { createGapAutoFillSchedulerSchema } from './schemas';
import { transformGapAutoFillSchedulerCreateParamToSavedObject } from './transforms/transform_gap_auto_fill_scheduler_param_to_saved_object';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_TASK_TYPE } from '../../../../lib/rule_gaps/types/scheduler';

export async function createGapAutoFillScheduler(
  context: RulesClientContext,
  params: CreateGapAutoFillSchedulerParams
): Promise<GapAutoFillSchedulerResponse> {
  try {
    createGapAutoFillSchedulerSchema.validate(params);
  } catch (error) {
    const { request: _omitRequest, ...otherParams } = params;
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler parameters - ${(error as Error).message}
Payload summary: ${JSON.stringify(otherParams, (key, value) =>
        key === 'request' ? undefined : value
      )}`
    );
  }

  try {
    for (const ruleType of params.ruleTypes) {
      await context.authorization.ensureAuthorized({
        ruleTypeId: ruleType.type,
        consumer: ruleType.consumer,
        operation: WriteOperations.CreateGapAutoFillScheduler,
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

  try {
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

    const savedObjectOptions: SavedObjectsCreateOptions = {
      refresh: 'wait_for' as const,
    };
    if (params.id) {
      savedObjectOptions.id = params.id;
    }

    const so = await soClient.create(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes,
      savedObjectOptions
    );

    const task = await taskManager.ensureScheduled(
      {
        id: so.id,
        taskType: GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
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
    await soClient.update<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      so.id,
      {
        scheduledTaskId: task.id,
        updatedAt: new Date().toISOString(),
      }
    );

    const updatedSo = await soClient.get<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      so.id
    );

    // Log successful creation
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.CREATE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: updatedSo.id,
          name: updatedSo.attributes.name,
        },
      })
    );

    // Transform the saved object to the result format
    return transformSavedObjectToGapAutoFillSchedulerResult({
      savedObject: updatedSo,
    });
  } catch (error) {
    throw Boom.boomify(error, { message: 'Failed to create gap auto fill scheduler' });
  }
}
