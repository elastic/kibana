/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RawRule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';
import { untrackRuleAlerts, migrateLegacyActions } from '../../../../rules_client/lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { DeleteRuleParams } from './types';
import { deleteRuleParamsSchema } from './schemas';
import { deleteRuleSo, getDecryptedRuleSo, getRuleSo } from '../../../../data/rule';

export async function deleteRule(context: RulesClientContext, params: DeleteRuleParams) {
  try {
    deleteRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating delete params - ${error.message}`);
  }

  const { id } = params;

  return await retryIfConflicts(
    context.logger,
    `rulesClient.delete('${id}')`,
    async () => await deleteRuleWithOCC(context, { id })
  );
}

async function deleteRuleWithOCC(context: RulesClientContext, { id }: { id: string }) {
  let taskIdToRemove: string | undefined | null;
  let apiKeyToInvalidate: string | null = null;
  let apiKeyCreatedByUser: boolean | undefined | null = false;
  let attributes: RawRule;

  try {
    const decryptedRule = await getDecryptedRuleSo({
      encryptedSavedObjectsClient: context.encryptedSavedObjectsClient,
      id,
      savedObjectsGetOptions: {
        namespace: context.namespace,
      },
    });
    apiKeyToInvalidate = decryptedRule.attributes.apiKey;
    apiKeyCreatedByUser = decryptedRule.attributes.apiKeyCreatedByUser;
    taskIdToRemove = decryptedRule.attributes.scheduledTaskId;
    attributes = decryptedRule.attributes;
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `delete(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );

    // Still attempt to load the scheduledTaskId using SOC
    const rule = await getRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      id,
    });
    taskIdToRemove = rule.attributes.scheduledTaskId;
    attributes = rule.attributes;
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Delete,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DELETE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  await untrackRuleAlerts(context, id, attributes);

  // migrate legacy actions only for SIEM rules
  // TODO (http-versioning): Remove this cast, this enables us to move forward
  // without fixing all of other solution types
  if (attributes.consumer === AlertConsumers.SIEM) {
    await migrateLegacyActions(context, {
      ruleId: id,
      attributes: attributes as RawRule,
      skipActionsValidation: true,
    });
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.DELETE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );
  const removeResult = await deleteRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id,
  });

  await Promise.all([
    taskIdToRemove ? context.taskManager.removeIfExists(taskIdToRemove) : null,
    context.backfillClient.deleteBackfillForRules({
      ruleIds: [id],
      namespace: context.namespace,
      unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    }),
    apiKeyToInvalidate && !apiKeyCreatedByUser
      ? bulkMarkApiKeysForInvalidation(
          { apiKeys: [apiKeyToInvalidate] },
          context.logger,
          context.unsecuredSavedObjectsClient
        )
      : null,
  ]);

  return removeResult;
}
