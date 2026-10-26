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
  cloneApiKey?: boolean;
  refresh?: boolean | 'wait_for';
}

/**
 * Picks the API key an enabled rule runs on. The choice depends only on the current request,
 * never on the rule's existing `apiKeyCreatedByUser`:
 *
 * - session authentication → a framework-managed key is granted (`apiKeyCreatedByUser: false`)
 * - API key authentication, undeclared → the caller's key is stored (`apiKeyCreatedByUser: true`)
 * - API key authentication declared borrowed (`cloneApiKey` option or the client-level
 *   `cloneApiKeysOnCreate` flag set from `x-kbn-alerting-clone-api-key`) → a framework-managed
 *   key is cloned from the caller's (`apiKeyCreatedByUser: false`)
 *
 * A borrowed key belongs to a task and is revoked when that task ends, so it is never persisted
 * regardless of who owned the rule's key before. The rule's previous ownership only matters for
 * cleanup, which the update paths handle: a replaced framework-managed key is queued for
 * invalidation, a replaced user-owned key is left alone.
 */
export const resolveRuleAPIKey = async (
  context: RulesClientContext,
  name: string,
  enabled: boolean,
  { cloneApiKey, refresh }: ResolveRuleAPIKeyOptions = {}
): Promise<ResolvedAPIKey> => {
  if (!enabled) {
    return { createdAPIKey: null, isAuthTypeApiKey: false };
  }

  const isApiKeyAuth = context.isAuthenticationTypeAPIKey();

  // Without API-key authentication there is nothing to clone (cloneAsInternalUser would throw),
  // so a borrowed declaration is a no-op and the rule is granted a framework key below.
  const callerKeyIsBorrowed =
    (Boolean(cloneApiKey) || Boolean(context.cloneApiKeysOnCreate)) && isApiKeyAuth;

  if (callerKeyIsBorrowed) {
    return cloneKey(context, name);
  }

  if (isApiKeyAuth) {
    return {
      createdAPIKey: context.getAuthenticationAPIKey(`${name}-user-created`),
      isAuthTypeApiKey: true,
    };
  }

  return grantKey(context, name, refresh);
};
