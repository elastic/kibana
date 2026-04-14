/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import type { ReadOperations, WriteOperations } from '../../../../authorization';
import { AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { SchedulerContext } from '../../methods/utils';

/**
 * Fetches the gap auto fill scheduler saved object and performs rule type based authorization.
 */
export const getGapAutoFillSchedulerSO = async ({
  context,
  id,
  operation,
  authAuditAction,
}: {
  context: RulesClientContext;
  id: string;
  operation: ReadOperations | WriteOperations;
  authAuditAction: GapAutoFillSchedulerAuditAction;
}) => {
  const schedulerSO = await context.unsecuredSavedObjectsClient.get<GapAutoFillSchedulerSO>(
    GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
    id
  );

  // Check for errors in the savedObjectsClient result
  if (schedulerSO.error) {
    const err = new Error(schedulerSO.error.message);
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.GET,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id,
          name: id,
        },
        error: err,
      })
    );
    throw err;
  }

  const ruleTypeIdConsumersPairs = schedulerSO.attributes.ruleTypes.map((ruleType) => ({
    ruleTypeId: ruleType.type,
    consumers: [ruleType.consumer],
  }));

  try {
    await context.authorization.bulkEnsureAuthorized({
      ruleTypeIdConsumersPairs,
      operation,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: authAuditAction,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id,
          name: schedulerSO.attributes.name,
        },
        error,
      })
    );
    throw error;
  }

  return schedulerSO;
};

/**
 * Fetches the scheduler config (enabled + numRetries) for gap fill status calculation.
 * Skips authorization, the caller already has permission to read gaps/rules,
 * and the scheduler lookup is an internal detail of status computation.
 * Returns null if the scheduler does not exist or if the lookup fails for any reason.
 * Failures are non-fatal: the gap query will proceed without error status detection.
 */
export const getSchedulerContextInternal = async (
  savedObjectsClient: SavedObjectsClientContract,
  schedulerId: string
): Promise<SchedulerContext | null> => {
  try {
    const schedulerSO = await savedObjectsClient.get<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      schedulerId
    );
    return {
      enabled: schedulerSO.attributes.enabled,
      numRetries: schedulerSO.attributes.numRetries,
    };
  } catch {
    return null;
  }
};
