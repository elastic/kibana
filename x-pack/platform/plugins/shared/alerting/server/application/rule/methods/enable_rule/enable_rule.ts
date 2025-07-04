/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { RawRule, IntervalSchedule } from '../../../../types';
import { resetMonitoringLastRun, getNextRun } from '../../../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import {
  updateMeta,
  createNewAPIKeySet,
  scheduleTask,
  bulkMigrateLegacyActions,
} from '../../../../rules_client/lib';
import { validateScheduleLimit } from '../get_schedule_frequency';
import { getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { EnableRuleParams } from './types';
import { enableRuleParamsSchema } from './schemas';

export async function enableRule(
  context: RulesClientContext,
  { id }: EnableRuleParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.enableRule('${id}')`,
    async () => await enableWithOCC(context, { id })
  );
}

async function enableWithOCC(context: RulesClientContext, params: EnableRuleParams) {
  let existingApiKey: string | null = null;
  let attributes: RawRule;
  let version: string | undefined;

  try {
    enableRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating enable rule parameters - ${error.message}`);
  }

  const { id } = params;
  let alert: SavedObject<RawRule>;
  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        {
          namespace: context.namespace,
        }
      );
    existingApiKey = decryptedAlert.attributes.apiKey;
    attributes = decryptedAlert.attributes;
    version = decryptedAlert.version;
    alert = decryptedAlert;
  } catch (e) {
    context.logger.error(`enable(): Failed to load API key of alert ${id}: ${e.message}`);
    // Still attempt to load the attributes and version using SOC
    alert = await context.unsecuredSavedObjectsClient.get<RawRule>(RULE_SAVED_OBJECT_TYPE, id);
    attributes = alert.attributes;
    version = alert.version;
  }

  const validationPayload = await validateScheduleLimit({
    context,
    updatedInterval: attributes.schedule.interval,
  });

  if (validationPayload) {
    throw Boom.badRequest(
      getRuleCircuitBreakerErrorMessage({
        name: attributes.name,
        interval: validationPayload.interval,
        intervalAvailable: validationPayload.intervalAvailable,
        action: 'enable',
      })
    );
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Enable,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.ENABLE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.ENABLE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  if (attributes.enabled === false) {
    const migratedIds = await bulkMigrateLegacyActions({ context, rules: [alert] });

    const username = await context.getUserName();
    const now = new Date();

    const schedule = attributes.schedule as IntervalSchedule;

    const updateAttributes = updateMeta(context, {
      ...attributes,
      ...(!existingApiKey &&
        (await createNewAPIKeySet(context, {
          id: attributes.alertTypeId,
          ruleName: attributes.name,
          username,
          shouldUpdateApiKey: true,
        }))),
      ...(attributes.monitoring && {
        monitoring: resetMonitoringLastRun(attributes.monitoring),
      }),
      nextRun: getNextRun({ interval: schedule.interval }),
      enabled: true,
      updatedBy: username,
      updatedAt: now.toISOString(),
      executionStatus: {
        status: 'pending',
        lastDuration: 0,
        lastExecutionDate: now.toISOString(),
        error: null,
        warning: null,
      },
    });

    try {
      // to mitigate AAD issues(actions property is not used for encrypting API key in partial SO update)
      // we call create with overwrite=true
      if (migratedIds.includes(alert.id)) {
        await context.unsecuredSavedObjectsClient.create<RawRule>(
          RULE_SAVED_OBJECT_TYPE,
          updateAttributes,
          {
            id,
            overwrite: true,
            version,
            references: alert.references,
          }
        );
      } else {
        await context.unsecuredSavedObjectsClient.update(
          RULE_SAVED_OBJECT_TYPE,
          id,
          updateAttributes,
          {
            version,
          }
        );
      }
    } catch (e) {
      throw e;
    }
  }

  let scheduledTaskIdToCreate: string | null = null;
  if (attributes.scheduledTaskId) {
    // If scheduledTaskId defined in rule SO, make sure it exists
    try {
      const task = await context.taskManager.get(attributes.scheduledTaskId);

      // Check whether task status is unrecognized. If so, we want to delete
      // this task and create a fresh one
      if (task.status === TaskStatus.Unrecognized) {
        await context.taskManager.removeIfExists(attributes.scheduledTaskId);
        scheduledTaskIdToCreate = id;
      }
    } catch (err) {
      scheduledTaskIdToCreate = id;
    }
  } else {
    // If scheduledTaskId doesn't exist in rule SO, set it to rule ID
    scheduledTaskIdToCreate = id;
  }

  if (scheduledTaskIdToCreate) {
    // Schedule the task if it doesn't exist
    const scheduledTask = await scheduleTask(context, {
      id,
      consumer: attributes.consumer,
      ruleTypeId: attributes.alertTypeId,
      schedule: attributes.schedule as IntervalSchedule,
      throwOnConflict: false,
    });
    await context.unsecuredSavedObjectsClient.update(RULE_SAVED_OBJECT_TYPE, id, {
      scheduledTaskId: scheduledTask.id,
    });
  } else {
    // Task exists so set enabled to true
    await context.taskManager.bulkEnable([attributes.scheduledTaskId!]);
  }
}
