/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { chooseApiKeySource } from '@kbn/response-ops-api-keys';
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

const grantKey = async (
  context: RulesClientContext,
  name: string,
  refresh?: boolean | 'wait_for'
): Promise<ResolvedAPIKey> => {
  const createdAPIKey = await withSpan({ name: 'createAPIKey', type: 'rules' }, () =>
    context.createAPIKey(name, refresh)
  );
  return { createdAPIKey, isAuthTypeApiKey: false };
};

export interface ResolveRuleAPIKeyOptions {
  apiKeyOwnership?: RuleApiKeyOwnership;
  cloneApiKey?: boolean;
  refresh?: boolean | 'wait_for';
}

export const resolveRuleAPIKey = async (
  context: RulesClientContext,
  name: string,
  enabled: boolean,
  { apiKeyOwnership, cloneApiKey, refresh }: ResolveRuleAPIKeyOptions = {}
): Promise<ResolvedAPIKey> => {
  if (!enabled) {
    return { createdAPIKey: null, isAuthTypeApiKey: false };
  }

  const isApiKeyAuth = context.isAuthenticationTypeAPIKey();

  // The client-level flag and the per-call option both declare the caller's API key as borrowed:
  // the rule must be minted its own key instead of persisting the caller's. The declaration is
  // about the current request, so the rule's existing ownership does not override it: a rule the
  // user created with their own key and that a workflow or Agent Builder later updates must not
  // end up storing the borrowed (and later revoked) key as user-owned. Without API-key
  // authentication there is no key to clone (cloneAsInternalUser would throw), so the declaration
  // is a no-op and the rule is granted a framework key as usual below.
  // A framework-managed rule keeps a framework-managed key, so the caller's key is cloned too.
  const source = chooseApiKeySource({
    apiKeyAuthenticated: isApiKeyAuth,
    clone:
      Boolean(cloneApiKey) ||
      Boolean(context.cloneApiKeysOnCreate) ||
      apiKeyOwnership?.apiKeyCreatedByUser === false,
    reuse: true,
  });

  switch (source) {
    case 'clone':
      return cloneKey(context, name);
    case 'reuse':
      return {
        createdAPIKey: context.getAuthenticationAPIKey(`${name}-user-created`),
        isAuthTypeApiKey: true,
      };
    case 'grant':
      return grantKey(context, name, refresh);
  }
};
