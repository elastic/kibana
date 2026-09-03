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

export interface RuleApiKeyOwnership {
  apiKeyCreatedByUser?: boolean | null;
}

const cloneKey = async (context: RulesClientContext, name: string): Promise<ResolvedAPIKey> => {
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
  apiKeyOwnership?: RuleApiKeyOwnership
): Promise<ResolvedAPIKey> => {
  if (!enabled) {
    return { createdAPIKey: null, isAuthTypeApiKey: false };
  }

  if (!apiKeyOwnership && context.cloneApiKeysOnCreate) {
    return cloneKey(context, name);
  }

  const isApiKeyAuth = context.isAuthenticationTypeAPIKey();
  const frameworkManaged = apiKeyOwnership?.apiKeyCreatedByUser === false;

  if (frameworkManaged) {
    return isApiKeyAuth ? cloneKey(context, name) : grantKey(context, name);
  }

  if (isApiKeyAuth) {
    // Only a *user-created* key may be persisted on the rule, where it is flagged
    // `apiKeyCreatedByUser` and left alone: the user owns its rotation and revocation. An
    // internal key belongs to an Elastic service instead (e.g. the key Task Manager grants for a
    // background task, which it invalidates once that task completes), so a rule holding it would
    // silently die when the service cleans up — and `apiKeyCreatedByUser` would then block
    // rotation, invalidation, repair and provisioning alike. Mint a framework-owned key instead,
    // making such rules indistinguishable from ones created from the UI.
    if (context.isAuthenticationInternalAPIKey()) {
      return cloneKey(context, name);
    }

    return {
      createdAPIKey: context.getAuthenticationAPIKey(`${name}-user-created`),
      isAuthTypeApiKey: true,
    };
  }

  return grantKey(context, name);
};
