/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import type { RulesClientContext } from '../../../../rules_client/types';
import { apiKeyAsRuleDomainProperties, generateAPIKeyName } from '../../../../rules_client/common';
import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { RawEsqlRule } from '../../../../saved_objects/schemas/raw_esql_rule';
import { ensureEsqlRuleTaskScheduled, getEsqlRuleTaskId } from '../../../../rna_esql_task/schedule';
import { updateEsqlRuleDataSchema } from './schemas';
import type { UpdateEsqlRuleData } from './types';
import type { EsqlRuleResponse } from '../create/types';

export async function updateEsqlRule(
  context: RulesClientContext,
  { id, data }: { id: string; data: UpdateEsqlRuleData }
): Promise<EsqlRuleResponse> {
  try {
    updateEsqlRuleDataSchema.validate(data);
  } catch (error) {
    throw Boom.badRequest(`Error validating update ES|QL rule data - ${error.message}`);
  }

  const username = await context.getUserName();
  const nowIso = new Date().toISOString();

  // Read decrypted rule so we can keep apiKey + apiKeyCreatedByUser + AAD stable on overwrite.
  let existingAttrs: RawEsqlRule;
  let existingVersion: string | undefined;
  try {
    const decrypted =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawEsqlRule>(
        ESQL_RULE_SAVED_OBJECT_TYPE,
        id,
        { namespace: context.namespace }
      );
    existingAttrs = decrypted.attributes;
    existingVersion = decrypted.version;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw Boom.notFound(`ES|QL rule with id "${id}" not found`);
    }
    throw e;
  }

  const wasEnabled = Boolean(existingAttrs.enabled);
  const willBeEnabled = data.enabled !== undefined ? Boolean(data.enabled) : wasEnabled;

  // Build the next attributes, we'll overwrite the whole SO.
  let nextAttrs: RawEsqlRule = {
    ...existingAttrs,
    ...data,
    updatedBy: username,
    updatedAt: nowIso,
  };

  // Enable transition: ensure we have an API key.
  if (!wasEnabled && willBeEnabled) {
    let createdAPIKey = null;
    let isAuthTypeApiKey = false;
    try {
      isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();
      const name = generateAPIKeyName('esql', nextAttrs.name);
      createdAPIKey = isAuthTypeApiKey
        ? context.getAuthenticationAPIKey(`${name}-user-created`)
        : await context.createAPIKey(name);
    } catch (error) {
      throw Boom.badRequest(
        `Error enabling ES|QL rule: could not create API key - ${error.message}`
      );
    }

    nextAttrs = {
      ...nextAttrs,
      ...apiKeyAsRuleDomainProperties(createdAPIKey, username, isAuthTypeApiKey),
    };
  }

  // Disable transition: remove task and clear task id.
  if (wasEnabled && !willBeEnabled) {
    const taskId =
      existingAttrs.scheduledTaskId ?? getEsqlRuleTaskId({ ruleId: id, spaceId: context.spaceId });
    await context.taskManager.removeIfExists(taskId);
    nextAttrs = { ...nextAttrs, scheduledTaskId: null };
  }

  // If enabled, ensure task exists and schedule is up-to-date (also handles schedule changes).
  if (willBeEnabled) {
    const { id: taskId } = await ensureEsqlRuleTaskScheduled({
      services: { taskManager: context.taskManager },
      input: {
        ruleId: id,
        spaceId: context.spaceId,
        schedule: { interval: nextAttrs.schedule },
      },
    });
    nextAttrs = { ...nextAttrs, scheduledTaskId: taskId };
  }

  try {
    await context.unsecuredSavedObjectsClient.create<RawEsqlRule>(
      ESQL_RULE_SAVED_OBJECT_TYPE,
      nextAttrs,
      {
        id,
        overwrite: true,
        ...(existingVersion ? { version: existingVersion } : {}),
      }
    );
  } catch (e) {
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      throw Boom.conflict(`ES|QL rule with id "${id}" has already been updated by another user`);
    }
    throw e;
  }

  const { apiKey, ...rest } = nextAttrs;
  return { id, ...rest, scheduledTaskId: nextAttrs.scheduledTaskId ?? null };
}
