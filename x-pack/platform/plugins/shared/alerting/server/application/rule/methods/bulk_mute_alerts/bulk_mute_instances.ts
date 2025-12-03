/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { SavedObjectsBulkUpdateResponse } from '@kbn/core-saved-objects-api-server';
import { bulkUpdateRuleSo } from '../../../../data/rule/methods/bulk_update_rule_so';
import { bulkGetRulesSo } from '../../../../data/rule/methods/bulk_get_rules_so';
import type { BulkEditOperationResult } from '../../../../rules_client/common/bulk_edit/retry_if_bulk_edit_conflicts';
import { retryIfBulkEditConflicts } from '../../../../rules_client/common/bulk_edit/retry_if_bulk_edit_conflicts';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { bulkMuteAlertsParamsSchema } from './schemas';
import type { BulkMuteAlertsParams } from './types';
import type { BulkEnsureAuthorizedOpts } from '../../../../authorization';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { transformMuteRequestToRuleAttributes } from './transform_rule_mute_instance_ids';
import type { RawRule } from '../../../../saved_objects/schemas/raw_rule';

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

async function bulkMuteInstancesWithOCC(
  context: RulesClientContext,
  params: BulkMuteAlertsParams
): Promise<BulkEditOperationResult> {
  let bulkUpdateRes: SavedObjectsBulkUpdateResponse<RawRule>;
  const rules = await bulkGetRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    ids: params.rules.map((p) => p.id),
  });

  try {
    const ruleTypeIdConsumersPairs: BulkEnsureAuthorizedOpts['ruleTypeIdConsumersPairs'] = [];
    const rulesSavedObjects: Array<SavedObject<RawRule>> = [];
    rules.saved_objects.forEach((rule) => {
      if (rule.error) {
        return;
      }

      rulesSavedObjects.push(rule);
      ruleTypeIdConsumersPairs.push({
        ruleTypeId: rule.attributes.alertTypeId,
        consumers: [rule.attributes.consumer],
      });
    });

    await context.authorization.bulkEnsureAuthorized({
      ruleTypeIdConsumersPairs,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    for (const rule of rulesSavedObjects) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.BULK_MUTE_ALERTS,
          outcome: 'unknown',
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.attributes.name },
        })
      );
    }

    const rulesToUpdate = transformMuteRequestToRuleAttributes({
      savedRules: rulesSavedObjects,
      paramRules: params.rules,
    });

    bulkUpdateRes = await bulkUpdateRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      rules: rulesToUpdate,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.BULK_MUTE_ALERTS,
        error,
      })
    );
    context.logger.error(`Error while bulk muting alerts: ${error.message}`);

    throw error;
  }

  return {
    apiKeysToInvalidate: [],
    resultSavedObjects: bulkUpdateRes.saved_objects,
    errors: [],
    rules: [],
    skipped: [],
  };
}
