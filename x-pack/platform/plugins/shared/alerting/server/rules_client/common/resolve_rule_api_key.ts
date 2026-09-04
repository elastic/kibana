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
  // schedule — so mint the rule a framework-owned key with the same privileges instead. This is
  // the caller-declared counterpart of the internal-key verdict below, which only UIAM reports:
  // for Elasticsearch API keys there is no verdict, so this flag is the only way a caller can
  // prevent its borrowed credential from being persisted. Without API-key authentication there is
  // nothing to take ownership of and the flag is a no-op, so callers may set it unconditionally.
  if (cloneApiKey && !apiKeyOwnership && isApiKeyAuth) {
    return cloneKey(context, name);
  }

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
