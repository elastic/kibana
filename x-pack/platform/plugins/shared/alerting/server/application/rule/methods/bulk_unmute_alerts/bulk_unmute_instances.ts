/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  SavedObject,
  SavedObjectsBulkUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { transformUnmuteRequestToRuleAttributes } from './transforms/transform_rule_unmute_instance_ids';
import { retryIfBulkEditConflicts } from '../../../../rules_client/common';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { bulkMuteUnmuteAlertsParamsSchema } from '../../schemas/bulk_mute_unmute_schema';
import type { BulkMuteUnmuteAlertsParams } from '../../types';
import type { RawRule } from '../../../../types';
import {
  AlertingAuthorizationEntity,
  type BulkEnsureAuthorizedOpts,
  WriteOperations,
} from '../../../../authorization';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { bulkGetRulesSo, bulkUpdateRuleSo } from '../../../../data/rule';
import type { BulkEditOperationResult } from '../../../../rules_client/common/bulk_edit';
import { transformParamsRulesToAlertInstances } from '../../transforms/transform_bulk_mute_unmute_rules_to_alert_instances';

export async function bulkUnmuteInstances(
  context: RulesClientContext,
  params: BulkMuteUnmuteAlertsParams
): Promise<void> {
  try {
    bulkMuteUnmuteAlertsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  await retryIfBulkEditConflicts(
    context.logger,
    `rulesClient.bulkUnmuteInstances('${JSON.stringify(params)}')`,
    async () => await bulkUnmuteInstancesWithOCC(context, params)
  );
}

const EMPTY_RESULT = {
  apiKeysToInvalidate: [],
  resultSavedObjects: [],
  errors: [],
  rules: [],
  skipped: [],
};

async function bulkUnmuteInstancesWithOCC(
  context: RulesClientContext,
  params: BulkMuteUnmuteAlertsParams
): Promise<BulkEditOperationResult> {
  let bulkUpdateRes: SavedObjectsBulkUpdateResponse<RawRule>;

  if (params.rules.length === 0) {
    return EMPTY_RESULT;
  }

  const rules = await bulkGetRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    ids: params.rules.map((p) => p.id),
  });

  try {
    const rulesSavedObjects: Array<SavedObject<RawRule>> = [];
    const ruleTypeIdConsumersPairs: BulkEnsureAuthorizedOpts['ruleTypeIdConsumersPairs'] = [];
    const ruleTypeIds = new Set<string>();

    if (rules.saved_objects.length === 0) {
      throw Boom.badRequest(`Rules not found: ${JSON.stringify(params.rules.map((r) => r.id))}`);
    }

    rules.saved_objects.forEach((rule) => {
      if (rule.error) {
        return;
      }

      rulesSavedObjects.push(rule);
      ruleTypeIds.add(rule.attributes.alertTypeId);
      ruleTypeIdConsumersPairs.push({
        ruleTypeId: rule.attributes.alertTypeId,
        consumers: [rule.attributes.consumer],
      });
    });
    const indices = context.getAlertIndicesAlias(Array.from(ruleTypeIds), context.spaceId);

    await context.authorization.bulkEnsureAuthorized({
      ruleTypeIdConsumersPairs,
      operation: WriteOperations.UnmuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    for (const rule of rulesSavedObjects) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.BULK_UNMUTE_ALERTS,
          outcome: 'unknown',
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.attributes.name },
        })
      );
    }

    const rulesToUpdate = transformUnmuteRequestToRuleAttributes({
      savedRules: rulesSavedObjects,
      paramRules: params.rules,
    });

    bulkUpdateRes = await bulkUpdateRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      rules: rulesToUpdate,
    });

    if (indices && indices.length > 0) {
      await context.alertsService?.unmuteAlertInstances({
        targets: transformParamsRulesToAlertInstances(params.rules),
        indices,
        logger: context.logger,
      });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.BULK_UNMUTE_ALERTS,
        error,
      })
    );
    context.logger.error(`Error while bulk unmuting alerts: ${error.message}`);

    throw error;
  }

  return {
    apiKeysToInvalidate: [],
    resultSavedObjects: bulkUpdateRes?.saved_objects ?? [],
    errors: [],
    rules: [],
    skipped: [],
  };
}
