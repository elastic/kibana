/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RawRule } from '../../types';
import { generateAPIKeyName, apiKeyAsAlertAttributes } from '../common';
import type { RulesClientContext } from '../types';

export async function createNewAPIKeySet(
  context: RulesClientContext,
  {
    id,
    ruleName,
    username,
    shouldUpdateApiKey,
    errorMessage,
  }: {
    id: string;
    ruleName: string;
    username: string | null;
    shouldUpdateApiKey: boolean;
    errorMessage?: string;
  }
): Promise<Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser'>> {
  let createdAPIKey = null;
  let isAuthTypeApiKey = false;
  try {
    isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();
    const name = generateAPIKeyName(id, ruleName);
    createdAPIKey = shouldUpdateApiKey
      ? isAuthTypeApiKey
        ? context.getAuthenticationAPIKey(`${name}-user-created`)
        : await context.createAPIKey(name)
      : null;
  } catch (error) {
    const message = errorMessage ? errorMessage : 'Error creating API key for rule';
    throw Boom.badRequest(`${message} - ${error.message}`);
  }

  return apiKeyAsAlertAttributes(createdAPIKey, username, isAuthTypeApiKey);
}
