/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core/server';

import type { RulesClientContext } from '../../../../rules_client/types';
import { apiKeyAsRuleDomainProperties, generateAPIKeyName } from '../../../../rules_client/common';
import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { RawEsqlRule } from '../../../../saved_objects/schemas/raw_esql_rule';
import type { CreateEsqlRuleParams, EsqlRuleResponse } from './types';
import { createEsqlRuleDataSchema } from './schemas';

export async function createEsqlRule(
  context: RulesClientContext,
  { data, options }: CreateEsqlRuleParams
): Promise<EsqlRuleResponse> {
  try {
    createEsqlRuleDataSchema.validate(data);
  } catch (error) {
    throw Boom.badRequest(`Error validating create ES|QL rule data - ${error.message}`);
  }

  const id = options?.id ?? SavedObjectsUtils.generateId();
  const username = await context.getUserName();
  const nowIso = new Date().toISOString();

  let createdAPIKey = null;
  let isAuthTypeApiKey = false;
  try {
    isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();
    const name = generateAPIKeyName('esql', data.name);
    createdAPIKey = data.enabled
      ? isAuthTypeApiKey
        ? context.getAuthenticationAPIKey(`${name}-user-created`)
        : await context.createAPIKey(name)
      : null;
  } catch (error) {
    throw Boom.badRequest(`Error creating ES|QL rule: could not create API key - ${error.message}`);
  }

  const attributes: RawEsqlRule = {
    name: data.name,
    tags: data.tags ?? [],
    schedule: data.schedule,
    enabled: data.enabled,
    esql: data.esql,
    timeField: data.timeField,
    lookbackWindow: data.lookbackWindow,
    groupKey: data.groupKey ?? [],
    scheduledTaskId: null,
    createdBy: username,
    createdAt: nowIso,
    updatedBy: username,
    updatedAt: nowIso,
    ...apiKeyAsRuleDomainProperties(createdAPIKey, username, isAuthTypeApiKey),
  };

  try {
    await context.unsecuredSavedObjectsClient.create<RawEsqlRule>(
      ESQL_RULE_SAVED_OBJECT_TYPE,
      attributes,
      {
        id,
        overwrite: false,
      }
    );
  } catch (e) {
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      throw Boom.conflict(`ES|QL rule with id "${id}" already exists`);
    }
    throw e;
  }

  // Return without apiKey

  const { apiKey, ...rest } = attributes;
  return { id, ...rest };
}
