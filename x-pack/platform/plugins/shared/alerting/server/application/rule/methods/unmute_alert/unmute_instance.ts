/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Rule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { UnmuteAlertParams } from './types';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { unmuteAlertParamsSchema } from './schemas';
import { updateMeta } from '../../../../rules_client/lib';
import { updateRuleSo } from '../../../../data/rule';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';

export async function unmuteInstance(
  context: RulesClientContext,
  params: UnmuteAlertParams
): Promise<void> {
  const ruleId = params.alertId;
  try {
    unmuteAlertParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.unmuteInstance('${ruleId}')`,
    async () => await unmuteInstanceWithOCC(context, params)
  );
}

async function unmuteInstanceWithOCC(
  context: RulesClientContext,
  { alertId: ruleId, alertInstanceId }: UnmuteAlertParams
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    RULE_SAVED_OBJECT_TYPE,
    ruleId
  );

  const mutedInstanceIds = attributes.mutedInstanceIds || [];
  const snoozedInstances = attributes.snoozedInstances ?? [];
  const isSimpleMute = mutedInstanceIds.includes(alertInstanceId);
  const isConditionalSnooze = snoozedInstances.some((e) => e.instanceId === alertInstanceId);
  const auditAction =
    attributes.muteAll || isSimpleMute
      ? RuleAuditAction.UNMUTE_ALERT
      : RuleAuditAction.UNSNOOZE_ALERT;

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UnmuteAlert,
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

  if (attributes.muteAll) {
    return;
  }

  if (!isSimpleMute && !isConditionalSnooze) {
    return;
  }

  const indices = context.getAlertIndicesAlias([attributes.alertTypeId], context.spaceId);

  const ruleUpdates: Record<string, unknown> = {
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  };

  if (isSimpleMute) {
    ruleUpdates.mutedInstanceIds = mutedInstanceIds.filter((id: string) => id !== alertInstanceId);
  }

  if (isConditionalSnooze) {
    ruleUpdates.snoozedInstances = snoozedInstances.filter((e) => e.instanceId !== alertInstanceId);
  }

  await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id: ruleId,
    updateRuleAttributes: updateMeta(context, ruleUpdates),
  });

  if (indices && indices.length > 0) {
    await context.alertsService?.clearSnoozeAndUnmuteAlertInstances({
      ruleId,
      alertInstanceIds: [alertInstanceId],
      indices,
      logger: context.logger,
    });
  }
}
