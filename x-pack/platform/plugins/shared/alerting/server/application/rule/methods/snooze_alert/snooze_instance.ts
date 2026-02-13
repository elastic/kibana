/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SnoozedAlertInstance } from '@kbn/alerting-types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleSo } from '../../../../data/rule/methods/update_rule_so';
import type { SnoozeAlertOptions } from './types';
import type { Rule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';

export async function snoozeInstance(
  context: RulesClientContext,
  options: SnoozeAlertOptions
): Promise<void> {
  const { ruleId } = options;

  return await retryIfConflicts(
    context.logger,
    `rulesClient.snoozeInstance('${ruleId}')`,
    async () => await snoozeInstanceWithOCC(context, options)
  );
}

async function snoozeInstanceWithOCC(
  context: RulesClientContext,
  { ruleId, alertInstanceId, expiresAt, conditions, conditionOperator }: SnoozeAlertOptions
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
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
        action: RuleAuditAction.SNOOZE_ALERT,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.SNOOZE_ALERT,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  // Validate alert existence
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

  const existingSnoozedAlerts: SnoozedAlertInstance[] = attributes.snoozedAlerts ?? [];
  const userName = await context.getUserName();

  // Remove any existing entry for this alert instance (replace it)
  const filteredSnoozedAlerts = existingSnoozedAlerts.filter(
    (entry) => entry.alertInstanceId !== alertInstanceId
  );

  const newEntry: SnoozedAlertInstance = {
    alertInstanceId,
    mutedAt: new Date().toISOString(),
    mutedBy: userName ?? undefined,
    ...(expiresAt ? { expiresAt } : {}),
    ...(conditions && conditions.length > 0 ? { conditions } : {}),
    conditionOperator: conditionOperator ?? 'any',
  };

  filteredSnoozedAlerts.push(newEntry);

  await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id: ruleId,
    updateRuleAttributes: updateMeta(context, {
      snoozedAlerts: filteredSnoozedAlerts,
      updatedBy: userName,
      updatedAt: new Date().toISOString(),
    }),
  });
}
