/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleSo } from '../../../../data/rule/methods/update_rule_so';
import { bulkMuteAlertsParamsSchema } from './schemas';
import type { BulkMuteAlertsParams } from './types';
import type { Rule } from '../../../../types';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';

export async function bulkMuteInstances(
  context: RulesClientContext,
  params: BulkMuteAlertsParams
): Promise<void> {
  try {
    bulkMuteAlertsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.bulkMuteInstances('${params.ruleId}')`,
    async () => await bulkMuteInstancesWithOCC(context, params)
  );
}

async function bulkMuteInstancesWithOCC(
  context: RulesClientContext,
  { ruleId, alertInstanceIds }: BulkMuteAlertsParams
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
        action: RuleAuditAction.BULK_MUTE_ALERTS,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.BULK_MUTE_ALERTS,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  if (attributes.muteAll) {
    return;
  }

  const newMutedInstanceIds = [
    ...new Set([...(attributes.mutedInstanceIds || []), ...alertInstanceIds]),
  ];

  if (
    attributes.mutedInstanceIds &&
    newMutedInstanceIds.length === attributes.mutedInstanceIds.length
  ) {
    // No changes needed
    return;
  }

  await updateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsUpdateOptions: { version },
    id: ruleId,
    updateRuleAttributes: updateMeta(context, {
      mutedInstanceIds: newMutedInstanceIds,
      updatedBy: await context.getUserName(),
      updatedAt: new Date().toISOString(),
    }),
  });
}
