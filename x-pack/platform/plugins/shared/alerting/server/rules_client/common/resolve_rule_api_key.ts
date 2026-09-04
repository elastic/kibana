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

export interface ResolveRuleAPIKeyOptions {
  apiKeyOwnership?: RuleApiKeyOwnership;
  /**
   * The caller declares that the API key its request authenticated with is borrowed and must not
   * become the rule's key; a framework-owned key is minted instead. A no-op without API-key
   * authentication.
   */
  cloneApiKey?: boolean;
}

export const resolveRuleAPIKey = async (
  context: RulesClientContext,
  name: string,
  enabled: boolean,
  { apiKeyOwnership, cloneApiKey }: ResolveRuleAPIKeyOptions = {}
): Promise<ResolvedAPIKey> => {
  if (!enabled) {
    return { createdAPIKey: null, isAuthTypeApiKey: false };
  }

  if (!apiKeyOwnership && context.cloneApiKeysOnCreate) {
    return cloneKey(context, name);
  }

  const isApiKeyAuth = context.isAuthenticationTypeAPIKey();

  // The caller declared that the API key it authenticated with is not the rule's to keep — it is
  // borrowed, e.g. granted by Task Manager for a background task and invalidated on that service's
  // schedule — so mint the rule a framework-owned key with the same privileges instead of
  // persisting the caller's credential below. Without API-key authentication there is nothing to
  // take ownership of and the flag is a no-op, so callers may set it unconditionally.
  if (cloneApiKey && !apiKeyOwnership && isApiKeyAuth) {
    return cloneKey(context, name);
  }

  const frameworkManaged = apiKeyOwnership?.apiKeyCreatedByUser === false;

  if (frameworkManaged) {
    return isApiKeyAuth ? cloneKey(context, name) : grantKey(context, name);
  }

  if (isApiKeyAuth) {
    // The caller's key is persisted on the rule and flagged `apiKeyCreatedByUser`: the user owns
    // its rotation and revocation, and alerting leaves it alone. This treatment is only correct
    // for a credential the caller actually owns — a caller holding a borrowed key (e.g. one Task
    // Manager granted for a background task, which it invalidates once the task drains) must
    // declare it via `cloneApiKey` above, or the rule dies with the key, unrepairably:
    // `apiKeyCreatedByUser` also gates rotation, invalidation, repair and provisioning.
    return {
      createdAPIKey: context.getAuthenticationAPIKey(`${name}-user-created`),
      isAuthTypeApiKey: true,
    };
  }

  return grantKey(context, name);
};
