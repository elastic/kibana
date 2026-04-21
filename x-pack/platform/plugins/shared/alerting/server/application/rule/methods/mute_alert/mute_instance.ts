/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleSo } from '../../../../data/rule/methods/update_rule_so';
import { muteAlertBodySchema, muteAlertQuerySchema, muteAlertParamsSchema } from './schemas';
import type { MuteAlertBody, MuteAlertQuery, MuteAlertParams } from './types';
import type { RawRule } from '../../../../saved_objects/schemas/raw_rule';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';
import {
  buildPerAlertSnoozeEntry,
  getPerAlertSnoozeSnapshotFields,
  upsertPerAlertSnoozeEntry,
} from '../../../../rules_client/common/per_alert_snooze_utils';

export async function muteInstance(
  context: RulesClientContext,
  { params, query, body }: { params: MuteAlertParams; query: MuteAlertQuery; body?: MuteAlertBody }
): Promise<void> {
  const ruleId = params.alertId;
  try {
    muteAlertParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  try {
    muteAlertQuerySchema.validate(query);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate query: ${error.message}`);
  }

  if (body) {
    try {
      muteAlertBodySchema.validate(body);
    } catch (error) {
      throw Boom.badRequest(`Failed to validate body: ${error.message}`);
    }
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteInstance('${ruleId}')`,
    async () => await muteInstanceWithOCC(context, params, query, body)
  );
}

async function muteInstanceWithOCC(
  context: RulesClientContext,
  { alertId: ruleId, alertInstanceId }: MuteAlertParams,
  { validateAlertsExistence }: MuteAlertQuery,
  body?: MuteAlertBody
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<RawRule>(
    RULE_SAVED_OBJECT_TYPE,
    ruleId
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE_ALERT,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.MUTE_ALERT,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const indices = context.getAlertIndicesAlias([attributes.alertTypeId], context.spaceId);
  const updatedAt = new Date().toISOString();
  const updatedBy = await context.getUserName();
  const ensureAlertExists = async () => {
    const isExistingAlert = await context.alertsService?.isExistingAlert({
      indices,
      alertId: alertInstanceId,
      ruleId,
    });

    if (!isExistingAlert) {
      throw Boom.notFound(
        `Alert instance with id "${alertInstanceId}" does not exist for rule with id "${ruleId}"`
      );
    }
  };
  let updateRuleAttributes:
    | {
        snoozedInstances?: RawRule['snoozedInstances'];
        mutedInstanceIds?: RawRule['mutedInstanceIds'];
        updatedBy: string | null;
        updatedAt: string;
      }
    | undefined;

  if (body) {
    const snapshotFields = getPerAlertSnoozeSnapshotFields(body);
    let snoozeSnapshot: Record<string, unknown> | undefined;

    if (snapshotFields.length > 0) {
      snoozeSnapshot =
        (await context.alertsService?.getAlertSnoozeSnapshot({
          indices,
          alertId: alertInstanceId,
          ruleId,
          fields: snapshotFields,
        })) ?? undefined;

      if (!snoozeSnapshot) {
        throw Boom.notFound(
          `Alert instance with id "${alertInstanceId}" does not exist for rule with id "${ruleId}"`
        );
      }
    } else if (validateAlertsExistence) {
      await ensureAlertExists();
    }

    const snoozedInstance = buildPerAlertSnoozeEntry({
      alertInstanceId,
      body,
      snoozedAt: updatedAt,
      snoozedBy: updatedBy,
      snoozeSnapshot,
    });

    updateRuleAttributes = {
      snoozedInstances: upsertPerAlertSnoozeEntry({
        snoozedInstances: attributes.snoozedInstances,
        snoozedInstance,
      }),
      updatedBy,
      updatedAt,
    };

    console.log('conditional snooze payload', {
      snapshotFields,
      snoozedInstance,
      savedSnoozeSnapshot: snoozedInstance.snoozeSnapshot,
      conditions: [...(body?.conditions ?? [])],
    });
  } else {
    if (validateAlertsExistence) {
      await ensureAlertExists();
    }

    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
      mutedInstanceIds.push(alertInstanceId);

      updateRuleAttributes = {
        mutedInstanceIds,
        updatedBy,
        updatedAt,
      };
    }
  }

  if (!updateRuleAttributes) {
    return;
  }

  await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id: ruleId,
    updateRuleAttributes: updateMeta(context, updateRuleAttributes),
  });

  if (!body && indices && indices.length > 0) {
    await context.alertsService?.muteAlertInstance({
      ruleId,
      alertInstanceId,
      indices,
      logger: context.logger,
    });
  }
}
