/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsCreateOptions } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../../rules_client/types';
import type { CreateGapAutoFillSchedulerParams } from './types';
import type { GapAutoFillSchedulerResponse } from '../../result/types';
import { createGapAutoFillSchedulerSchema } from './schemas';
import { transformGapAutoFillSchedulerCreateParamToSavedObject } from './transforms/transform_gap_auto_fill_scheduler_param_to_saved_object';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../../saved_objects';
import type { GapAutoFillSchedulerSO } from '../../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_TASK_TYPE } from '../../../types/scheduler';

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
    const uniqueRuleTypeIds = new Set(params.ruleTypes.map(({ type }) => type));

    // Throw error if a rule type is not registered
    for (const ruleTypeId of uniqueRuleTypeIds) {
      context.ruleTypeRegistry.get(ruleTypeId);
    }

    // Throw error if a gap auto fill scheduler already exists for the same (rule type, consumer) pair
    const pairs = Array.from(new Set(params.ruleTypes.map((rt) => `${rt.type}:${rt.consumer}`)));
    if (pairs.length > 0) {
      const filter = `(${pairs
        .map(
          (p) =>
            `${GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE}.attributes.ruleTypeConsumerPairs: "${p}"`
        )
        .join(' or ')})`;
      const { saved_objects: candidates } = await soClient.find<GapAutoFillSchedulerSO>({
        type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
        perPage: 1,
        filter,
      });
      if (candidates.length > 0) {
        // Pairs are exact; any match is a duplicate
        throw Boom.conflict(
          `A gap auto fill scheduler already exists for at least one of the specified (rule type, consumer) pairs`
        );
      }
    }

    const createdBy = await context.getUserName();

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

    if (params.enabled) {
      try {
        await taskManager.ensureScheduled(
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
      } catch (e) {
        context.logger.error(
          `Failed to schedule task for gap auto fill scheduler ${so.id}. Will attempt to delete the saved object.`
        );
        try {
          await soClient.delete(GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE, so.id);
        } catch (deleteError) {
          context.logger.error(
            `Failed to delete gap auto fill saved object for gap auto fill scheduler ${so.id}.`
          );
        }
        throw e;
      }
    }

    // Log successful creation
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.CREATE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: so.id,
          name: so.attributes.name,
        },
      })
    );

    // Transform the saved object to the result format
    return transformSavedObjectToGapAutoFillSchedulerResult({
      savedObject: so,
    });
  } catch (error) {
    throw Boom.boomify(error, { message: 'Failed to create gap auto fill scheduler' });
  }
}
