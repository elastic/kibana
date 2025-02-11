/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { RulesClientContext } from '../../../../rules_client';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import {
  AdHocRunAuditAction,
  adHocRunAuditEvent,
} from '../../../../rules_client/common/audit_events';
import { transformAdHocRunToBackfillResult } from '../../transforms';
import { updateGaps } from '../../../../lib/rule_gaps/update/update_gaps';

export async function deleteBackfill(context: RulesClientContext, id: string): Promise<{}> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.deleteBackfill('${id}')`,
    async () => await deleteWithOCC(context, { id })
  );
}

async function deleteWithOCC(context: RulesClientContext, { id }: { id: string }) {
  try {
    const result = await context.unsecuredSavedObjectsClient.get<AdHocRunSO>(
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      id
    );

    // Check for errors in the savedObjectClient result
    if (result.error) {
      const err = new Error(result.error.message);
      context.auditLogger?.log(
        adHocRunAuditEvent({
          action: AdHocRunAuditAction.DELETE,
          savedObject: {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id,
            name: `backfill for rule "${result.attributes.rule.name}"`,
          },
          error: new Error(result.error.message),
        })
      );
      throw err;
    }

    try {
      await context.authorization.ensureAuthorized({
        ruleTypeId: result.attributes.rule.alertTypeId,
        consumer: result.attributes.rule.consumer,
        operation: WriteOperations.DeleteBackfill,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      context.auditLogger?.log(
        adHocRunAuditEvent({
          action: AdHocRunAuditAction.DELETE,
          savedObject: {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id,
            name: `backfill for rule "${result.attributes.rule.name}"`,
          },
          error,
        })
      );
      throw error;
    }

    context.auditLogger?.log(
      adHocRunAuditEvent({
        action: AdHocRunAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id,
          name: `backfill for rule "${result.attributes.rule.name}"`,
        },
      })
    );

    const actionsClient = await context.getActionsClient();

    const backfillResult = transformAdHocRunToBackfillResult({
      adHocRunSO: result,
      isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
    });

    // delete the saved object
    const removeResult = await context.unsecuredSavedObjectsClient.delete(
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      id,
      {
        refresh: 'wait_for',
      }
    );

    if ('rule' in backfillResult) {
      const eventLogClient = await context.getEventLogClient();

      await updateGaps({
        ruleId: backfillResult.rule.id,
        start: new Date(backfillResult.start),
        end: backfillResult.end ? new Date(backfillResult.end) : new Date(),
        backfillSchedule: backfillResult.schedule,
        savedObjectsRepository: context.internalSavedObjectsRepository,
        logger: context.logger,
        eventLogClient,
        eventLogger: context.eventLogger,
        shouldRefetchAllBackfills: true,
        backfillClient: context.backfillClient,
        actionsClient,
      });
    }

    // remove the associated task
    await context.taskManager.removeIfExists(id);

    return removeResult;
  } catch (err) {
    const errorMessage = `Failed to delete backfill by id: ${id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
