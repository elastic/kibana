/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { GAP_AUTO_FILL_SCHEDULER_TASK_TYPE } from '../../../gaps/types/scheduler';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import type { GapAutoFillSchedulerResponse } from '../../result/types';
import { updateGapAutoFillSchedulerSchema } from './schemas';
import type { UpdateGapAutoFillSchedulerParams } from './types';
import { getGapAutoFillSchedulerSO } from '../utils';

const toRuleTypeKey = (ruleType: { type: string; consumer: string }) =>
  `${ruleType.type}:${ruleType.consumer}`;

export async function updateGapAutoFillScheduler(
  context: RulesClientContext,
  params: UpdateGapAutoFillSchedulerParams
): Promise<GapAutoFillSchedulerResponse> {
  try {
    updateGapAutoFillSchedulerSchema.validate(params);
  } catch (error) {
    const { request: _req, ...otherParams } = params;
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler update parameters - ${
        (error as Error).message
      }\nPayload summary: ${JSON.stringify(otherParams)}`
    );
  }

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;
  const schedulerSo = await getGapAutoFillSchedulerSO({
    context,
    id: params.id,
    operation: WriteOperations.UpdateGapAutoFillScheduler,
    authAuditAction: GapAutoFillSchedulerAuditAction.UPDATE,
  });

  const schedulerName = schedulerSo.attributes?.name ?? params.id;
  const existingRuleTypes = schedulerSo.attributes?.ruleTypes ?? [];
  const username = await context.getUserName?.();
  const updatedRuleTypes = params.ruleTypes ?? existingRuleTypes;
  const uniqueRuleTypeIds = new Set(updatedRuleTypes.map(({ type }) => type));

  // Throw error if a rule type is not registered
  for (const ruleTypeId of uniqueRuleTypeIds) {
    context.ruleTypeRegistry.get(ruleTypeId);
  }

  const updatedRuleTypePairs = Array.from(new Set(updatedRuleTypes.map(toRuleTypeKey)));
  if (updatedRuleTypePairs.length > 0) {
    const filter = `(${updatedRuleTypePairs
      .map(
        (pair) =>
          `${GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE}.attributes.ruleTypeConsumerPairs: "${pair}"`
      )
      .join(' or ')})`;

    const { saved_objects: candidates } = await soClient.find<GapAutoFillSchedulerSO>({
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      perPage: updatedRuleTypePairs.length + 1,
      filter,
    });

    const hasConflictingPair = candidates.some((candidate) => candidate.id !== params.id);
    if (hasConflictingPair) {
      throw Boom.conflict(
        `A gap auto fill scheduler already exists for at least one of the specified (rule type, consumer) pairs`
      );
    }
  }

  // Authorize against any newly requested rule types in the update params
  try {
    for (const ruleType of params.ruleTypes) {
      await context.authorization.ensureAuthorized({
        ruleTypeId: ruleType.type,
        consumer: ruleType.consumer,
        operation: WriteOperations.UpdateGapAutoFillScheduler,
        entity: AlertingAuthorizationEntity.Rule,
      });
    }
  } catch (error) {
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.UPDATE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: schedulerName,
        },
        error: error as Error,
      })
    );
    throw error;
  }

  const now = new Date().toISOString();
  const updatedEnabled = params.enabled;
  const updatedSchedule = params.schedule;
  const updatedScope = params.scope !== undefined ? params.scope : schedulerSo.attributes.scope;
  const updatedAttributes: Partial<GapAutoFillSchedulerSO> = {
    name: params.name,
    enabled: updatedEnabled,
    schedule: updatedSchedule,
    gapFillRange: params.gapFillRange,
    maxBackfills: params.maxBackfills,
    numRetries: params.numRetries,
    scope: updatedScope,
    ruleTypes: updatedRuleTypes,
    ruleTypeConsumerPairs: Array.from(new Set(updatedRuleTypes.map(toRuleTypeKey))),
    updatedAt: now,
    updatedBy: username ?? undefined,
  };

  try {
    await soClient.update<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id,
      updatedAttributes
    );
    const updatedSo = await soClient.get<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );
    const nextSchedulerName = updatedSo.attributes.name ?? schedulerName;

    await taskManager.removeIfExists(updatedSo.id);

    if (updatedEnabled) {
      await taskManager.ensureScheduled(
        {
          id: updatedSo.id,
          taskType: GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
          schedule: updatedSchedule,
          scope: updatedScope ?? [],
          params: {
            configId: updatedSo.id,
            spaceId: context.spaceId,
          },
          state: {},
        },
        {
          request: params.request,
        }
      );
    } else {
      await context.backfillClient.deleteBackfillsByInitiatorId({
        initiatorId: updatedSo.id,
        unsecuredSavedObjectsClient: soClient,
        shouldUpdateGaps: true,
        internalSavedObjectsRepository: context.internalSavedObjectsRepository,
        eventLogClient: await context.getEventLogClient(),
        eventLogger: context.eventLogger,
        actionsClient: await context.getActionsClient(),
      });
    }

    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.UPDATE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: nextSchedulerName,
        },
      })
    );

    return transformSavedObjectToGapAutoFillSchedulerResult({
      savedObject: updatedSo,
    });
  } catch (err) {
    const errorMessage = `Failed to update gap auto fill scheduler by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.UPDATE,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: schedulerName,
        },
        error: err as Error,
      })
    );
    throw Boom.boomify(err as Error, { message: errorMessage });
  }
}
