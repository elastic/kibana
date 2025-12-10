/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../rules_client/types';
import type { GapAutoFillSchedulerSO } from '../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import type { ReadOperations, WriteOperations } from '../../../authorization';
import { AlertingAuthorizationEntity } from '../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../saved_objects';

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

  try {
    for (const ruleType of schedulerSO.attributes.ruleTypes) {
      await context.authorization.ensureAuthorized({
        ruleTypeId: ruleType.type,
        consumer: ruleType.consumer,
        operation,
        entity: AlertingAuthorizationEntity.Rule,
      });
    }
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
