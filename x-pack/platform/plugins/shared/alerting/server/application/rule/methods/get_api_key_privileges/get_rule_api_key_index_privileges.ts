/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RawRule } from '../../../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

export interface GetRuleApiKeyIndexPrivilegesParams {
  id: string;
  /** Index name to required privilege names, as accepted by `_has_privileges`. */
  index: Record<string, string[]>;
}

export interface GetRuleApiKeyIndexPrivilegesResult {
  apiKeyOwner: string | null;
  /** False when the rule has no stored API key, for example a disabled rule. */
  hasApiKey: boolean;
  /** Index name to privilege name to authorized. Null when there is no key to check. */
  index: Record<string, Record<string, boolean>> | null;
}

/**
 * Reports whether the API key a rule executes with holds the given index privileges.
 * The key's privileges are a snapshot of its owner's roles taken when the rule was
 * last saved or enabled, so a role edit does not change the answer until the key is
 * refreshed. The decrypted key is used only to authenticate the privilege check and
 * never leaves this method. The caller must be able to read the rule.
 */
export async function getRuleApiKeyIndexPrivileges(
  context: RulesClientContext,
  { id, index }: GetRuleApiKeyIndexPrivilegesParams
): Promise<GetRuleApiKeyIndexPrivilegesResult> {
  if (Object.keys(index).length === 0) {
    throw Boom.badRequest('At least one index must be given');
  }

  const decrypted = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
    RULE_SAVED_OBJECT_TYPE,
    id,
    { namespace: context.namespace }
  );
  const { attributes } = decrypted;

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: ReadOperations.Get,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  const apiKeyOwner = attributes.apiKeyOwner ?? null;
  if (attributes.apiKey == null) {
    return { apiKeyOwner, hasApiKey: false, index: null };
  }
  if (context.checkApiKeyIndexPrivileges == null) {
    throw Boom.badRequest('Security is disabled, so API key privileges cannot be checked');
  }

  const result = await context.checkApiKeyIndexPrivileges({ apiKey: attributes.apiKey, index });
  return { apiKeyOwner, hasApiKey: true, index: result };
}
