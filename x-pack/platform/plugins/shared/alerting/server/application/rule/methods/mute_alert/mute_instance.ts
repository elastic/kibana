/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MutedAlertInstance } from '@kbn/alerting-types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleSo } from '../../../../data/rule/methods/update_rule_so';
import { muteAlertQuerySchema, muteAlertParamsSchema } from './schemas';
import type { MuteAlertQuery, MuteAlertParams } from './types';
import type { Rule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';

/** Returns true when the caller supplied conditional-snooze parameters. */
function hasSnoozeConditions(query: MuteAlertQuery): boolean {
  return Boolean(query.expiresAt || (query.conditions && query.conditions.length > 0));
}

export async function muteInstance(
  context: RulesClientContext,
  { params, query }: { params: MuteAlertParams; query: MuteAlertQuery }
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
    throw Boom.badRequest(`Failed to validate body: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteInstance('${ruleId}')`,
    async () => await muteInstanceWithOCC(context, params, query)
  );
}

async function muteInstanceWithOCC(
  context: RulesClientContext,
  { alertId: ruleId, alertInstanceId }: MuteAlertParams,
  query: MuteAlertQuery
) {
  const { validateAlertsExistence, expiresAt, conditions, conditionOperator } = query;

  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    RULE_SAVED_OBJECT_TYPE,
    ruleId
  );

  // Determine which audit action to use: SNOOZE_ALERT for conditional snooze, MUTE_ALERT for simple mute
  const auditAction = hasSnoozeConditions(query)
    ? RuleAuditAction.SNOOZE_ALERT
    : RuleAuditAction.MUTE_ALERT;

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
        action: auditAction,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: auditAction,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  if (validateAlertsExistence) {
    const indices = context.getAlertIndicesAlias([attributes.alertTypeId], context.spaceId);
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
  }

  const mutedInstanceIds = attributes.mutedInstanceIds || [];
  if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
    mutedInstanceIds.push(alertInstanceId);

    const userName = await context.getUserName();

    // Build the update attributes -- always update mutedInstanceIds for backward compat
    const updateAttrs: Record<string, unknown> = {
      mutedInstanceIds,
      updatedBy: userName,
      updatedAt: new Date().toISOString(),
    };

    // When conditional-snooze parameters are provided, also write to mutedAlerts
    if (hasSnoozeConditions(query)) {
      const existingMutedAlerts: MutedAlertInstance[] = attributes.mutedAlerts ?? [];

      // Remove any existing entry for this alert instance (replace it)
      const filteredMutedAlerts = existingMutedAlerts.filter(
        (entry) => entry.alertInstanceId !== alertInstanceId
      );

      const newEntry: MutedAlertInstance = {
        alertInstanceId,
        mutedAt: new Date().toISOString(),
        mutedBy: userName,
        ...(expiresAt ? { expiresAt } : {}),
        ...(conditions && conditions.length > 0 ? { conditions } : {}),
        conditionOperator: conditionOperator ?? 'any',
      };

      filteredMutedAlerts.push(newEntry);
      updateAttrs.mutedAlerts = filteredMutedAlerts;
    }

    const indices = context.getAlertIndicesAlias([attributes.alertTypeId], context.spaceId);

    await updateRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      savedObjectsUpdateOptions: { version },
      id: ruleId,
      updateRuleAttributes: updateMeta(context, updateAttrs),
    });

    if (indices && indices.length > 0) {
      await context.alertsService?.muteAlertInstance({
        ruleId,
        alertInstanceId,
        indices,
        logger: context.logger,
      });
    }
  }
}
