/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RawRule } from '../../../../saved_objects/schemas/raw_rule/latest';
import { bulkUpdateRuleSo } from '../../../../data/rule/methods/bulk_update_rule_so';
import { bulkGetRulesSo } from '../../../../data/rule/methods/bulk_get_rules_so';
import { retryIfBulkEditConflicts } from '../../../../rules_client/common/bulk_edit/retry_if_bulk_edit_conflicts';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { bulkMuteAlertsParamsSchema } from './schemas';
import type { BulkMuteAlertsParams } from './types';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';

export async function bulkMuteInstances(
  context: RulesClientContext,
  params: BulkMuteAlertsParams
): Promise<void> {
  try {
    bulkMuteAlertsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  await retryIfBulkEditConflicts(
    context.logger,
    `rulesClient.bulkMuteInstances('${JSON.stringify(params)}')`,
    async () => await bulkMuteInstancesWithOCC(context, params)
  );
}

async function bulkMuteInstancesWithOCC(context: RulesClientContext, params: BulkMuteAlertsParams) {
  // TODO: Handle errors returned by the SO client
  const rules = await bulkGetRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    ids: params.rules.map((p) => p.id),
  });

  try {
    const ruleTypeIdConsumersPairs = rules.saved_objects.map((rule) => ({
      ruleTypeId: rule.attributes.alertTypeId,
      consumers: [rule.attributes.consumer],
    }));

    await context.authorization.bulkEnsureAuthorized({
      ruleTypeIdConsumersPairs,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    for (const rule of rules.saved_objects) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.BULK_MUTE_ALERTS,
          outcome: 'unknown',
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.attributes.name },
        })
      );
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.BULK_MUTE_ALERTS,
        error,
      })
    );

    throw error;
  }

  const rulesToUpdate = params.rules.map((rule) => ({
    id: rule.id,
    // TODO: Inculde the existing mutedInstanceIds to avoid overwriting them
    attributes: transformRequestToRuleAttributes({ alertInstanceIds: rule.alertInstanceIds }),
  }));

  const bulkUpdateRes = await bulkUpdateRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    rules: rulesToUpdate,
  });

  // TODO: Populate the res correctly and return errors if any
  return {
    apiKeysToInvalidate: [],
    resultSavedObjects: bulkUpdateRes.saved_objects,
    errors: [],
    rules: [],
    skipped: [],
  };
}

const transformRequestToRuleAttributes = ({
  alertInstanceIds,
}: {
  alertInstanceIds: string[];
}): Pick<RawRule, 'mutedInstanceIds' | 'updatedAt'> => ({
  mutedInstanceIds: alertInstanceIds,
  updatedAt: new Date().toISOString(),
});
