/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { omit } from 'lodash';
import type { SavedObjectReference } from '@kbn/core/server';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import type { RawRule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { createNewAPIKeySet, updateMeta } from '../../../../rules_client/lib';
import { API_KEY_ATTRIBUTES_TO_STRIP } from '../../../../rules_client/common';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { logRuleChanges } from '../common_utils/log_rule_changes';
import type { UpdateApiKeyParams } from './types';
import { updateApiKeyParamsSchema } from './schemas';

export async function updateRuleApiKey(
  context: RulesClientContext,
  { id }: UpdateApiKeyParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.updateRuleApiKey('${id}')`,
    async () => await updateApiKeyWithOCC(context, { id })
  );
}

async function updateApiKeyWithOCC(context: RulesClientContext, { id }: UpdateApiKeyParams) {
  let oldApiKeyToInvalidate: string | null = null;
  let oldApiKeyCreatedByUser: boolean | undefined | null = false;
  let oldUiamApiKeyToInvalidate: string | undefined | null;
  let attributes: RawRule;
  let version: string | undefined;
  let references: SavedObjectReference[];

  try {
    updateApiKeyParamsSchema.validate({ id });
  } catch (error) {
    throw Boom.badRequest(`Error validating update api key parameters - ${error.message}`);
  }

  try {
    const decryptedAlert =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        {
          namespace: context.namespace,
        }
      );
    oldApiKeyToInvalidate = decryptedAlert.attributes.apiKey;
    oldApiKeyCreatedByUser = decryptedAlert.attributes.apiKeyCreatedByUser;
    oldUiamApiKeyToInvalidate = decryptedAlert.attributes.uiamApiKey;
    attributes = decryptedAlert.attributes;
    version = decryptedAlert.version;
    references = decryptedAlert.references;
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object.
    // The rotation still goes ahead so that this endpoint remains the recovery path for a rule
    // whose keys can no longer be decrypted, but the previous keys are abandoned without being
    // invalidated: a non-decryptable value cannot be read, so it cannot be queued for
    // invalidation. Log it so the abandoned credentials are auditable rather than silent.
    context.logger.error(
      `updateApiKey(): Failed to load API key to invalidate on alert ${id}: ${e.message}. The previous API keys of this rule will be abandoned without being invalidated.`
    );
    // Still attempt to load the attributes and version using SOC
    const alert = await context.unsecuredSavedObjectsClient.get<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      id
    );
    attributes = alert.attributes;
    version = alert.version;
    references = alert.references;
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UpdateApiKey,
      entity: AlertingAuthorizationEntity.Rule,
    });
    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UPDATE_API_KEY,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  const username = await context.getUserName();

  const apiKeyAttributes = await createNewAPIKeySet(context, {
    id: attributes.alertTypeId,
    ruleName: attributes.name,
    username,
    shouldUpdateApiKey: true,
    errorMessage: 'Error updating API key for rule: could not create API key',
    apiKeyOwnership: { apiKeyCreatedByUser: attributes.apiKeyCreatedByUser },
  });

  const updateAttributes = updateMeta(context, {
    ...omit(attributes, API_KEY_ATTRIBUTES_TO_STRIP),
    ...apiKeyAttributes,
    updatedAt: new Date().toISOString(),
    updatedBy: username,
  });

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UPDATE_API_KEY,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  try {
    // Write the whole document instead of a partial update. A partial update merges attributes,
    // so the API key attributes stripped above would keep their stored values rather than being
    // removed, leaving the rule holding a key that is queued for invalidation below. It also
    // avoids the AAD hazard that makes `apiKey` unsafe to partially update at all
    // (see `RuleAttributesNotPartiallyUpdatable`).
    const updatedRuleSavedObject = await context.unsecuredSavedObjectsClient.create<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      updateAttributes,
      {
        id,
        overwrite: true,
        version,
        references,
      }
    );

    await logRuleChanges({
      ruleSOs: [updatedRuleSavedObject],
      encryptedFieldsMap: new Map([
        [id, { apiKey: apiKeyAttributes.apiKey, uiamApiKey: apiKeyAttributes.uiamApiKey ?? null }],
      ]),
      rulesClientContext: context,
      changesContext: {
        action: RuleChangeTrackingAction.ruleUpdateApiKey,
      },
    });
  } catch (e) {
    const { apiKey, apiKeyCreatedByUser, uiamApiKey } = updateAttributes;

    const apiKeysToInvalidate = [];
    if (apiKey && !apiKeyCreatedByUser) {
      apiKeysToInvalidate.push(apiKey);
    }
    if (uiamApiKey) {
      apiKeysToInvalidate.push(uiamApiKey);
    }

    if (apiKeysToInvalidate.length > 0) {
      // Avoid unused API key
      await bulkMarkApiKeysForInvalidation(
        {
          apiKeys: apiKeysToInvalidate,
        },
        context.logger,
        context.unsecuredSavedObjectsClient
      );
    }

    throw e;
  }

  const oldApiKeysToInvalidate = [];
  if (oldApiKeyToInvalidate && !oldApiKeyCreatedByUser) {
    oldApiKeysToInvalidate.push(oldApiKeyToInvalidate);
  }
  if (oldUiamApiKeyToInvalidate && !oldApiKeyCreatedByUser) {
    oldApiKeysToInvalidate.push(oldUiamApiKeyToInvalidate);
  }

  if (oldApiKeysToInvalidate.length > 0) {
    await bulkMarkApiKeysForInvalidation(
      {
        apiKeys: oldApiKeysToInvalidate,
      },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
  }
}
