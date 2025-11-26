/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleSo } from '../../../../data/rule/methods/update_rule_so';
import { bulkUnmuteAlertsParamsSchema } from './schemas/bulk_unmute_alert_params_schema';
import type { BulkUnmuteAlertsParams } from './types';
import type { Rule } from '../../../../types';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { updateMeta } from '../../../../rules_client/lib';

export async function bulkUnmuteInstances(
  context: RulesClientContext,
  params: BulkUnmuteAlertsParams
): Promise<void> {
  try {
    bulkUnmuteAlertsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.bulkUnmuteInstances('${params.ruleId}')`,
    async () => await bulkUnmuteInstancesWithOCC(context, params)
  );
}

async function bulkUnmuteInstancesWithOCC(
  context: RulesClientContext,
  { ruleId, alertInstanceIds }: BulkUnmuteAlertsParams
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    RULE_SAVED_OBJECT_TYPE,
    ruleId
  );

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
        action: RuleAuditAction.BULK_UNMUTE_ALERTS,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.BULK_UNMUTE_ALERTS,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  if (attributes.muteAll) {
    return;
  }

  const newMutedInstanceIds = attributes.mutedInstanceIds?.filter(
    (id) => !alertInstanceIds.includes(id)
  ) ?? [];

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
