/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { RulesClientContext, CreateAPIKeyResult } from '../types';

export interface ResolvedAPIKey {
  createdAPIKey: CreateAPIKeyResult | null;
  isAuthTypeApiKey: boolean;
}

export interface ExistingRuleKeyState {
  apiKeyCreatedByUser?: boolean | null;
}

const cloneKey = async (context: RulesClientContext, name: string): Promise<ResolvedAPIKey> => {
  if (!context.cloneAPIKey) {
    throw new Error(
      'cloneAPIKey is not available on RulesClientContext — this should never happen as it is always defined by the factory'
    );
  }
  return { createdAPIKey: await context.cloneAPIKey(name), isAuthTypeApiKey: false };
};

const grantKey = async (context: RulesClientContext, name: string): Promise<ResolvedAPIKey> => {
  const createdAPIKey = await withSpan({ name: 'createAPIKey', type: 'rules' }, () =>
    context.createAPIKey(name)
  );
  return { createdAPIKey, isAuthTypeApiKey: false };
};

export const resolveRuleAPIKey = async (
  context: RulesClientContext,
  name: string,
  enabled: boolean,
  existing?: ExistingRuleKeyState
): Promise<ResolvedAPIKey> => {
  if (!enabled) {
    return { createdAPIKey: null, isAuthTypeApiKey: false };
  }

  if (!existing && context.cloneApiKeysOnCreate) {
    return cloneKey(context, name);
  }

  const isApiKeyAuth = context.isAuthenticationTypeAPIKey();
  const frameworkManaged = existing?.apiKeyCreatedByUser === false;

  if (frameworkManaged) {
    return isApiKeyAuth ? cloneKey(context, name) : grantKey(context, name);
  }

  if (isApiKeyAuth) {
    return {
      createdAPIKey: context.getAuthenticationAPIKey(`${name}-user-created`),
      isAuthTypeApiKey: true,
    };
  }

  return grantKey(context, name);
};
