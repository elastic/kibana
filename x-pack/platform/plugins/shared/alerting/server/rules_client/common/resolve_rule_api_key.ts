/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { RulesClientContext } from '../types';
import type { CreateAPIKeyResult } from '../types';

export interface ResolvedAPIKey {
  createdAPIKey: CreateAPIKeyResult | null;
  isAuthTypeApiKey: boolean;
}

export const resolveRuleAPIKey = async (
  context: RulesClientContext,
  name: string,
  enabled: boolean
): Promise<ResolvedAPIKey> => {
  if (!enabled) {
    return { createdAPIKey: null, isAuthTypeApiKey: false };
  }

  if (context.cloneAPIKey) {
    return { createdAPIKey: await context.cloneAPIKey(name), isAuthTypeApiKey: false };
  }

  const isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();
  if (isAuthTypeApiKey) {
    return {
      createdAPIKey: context.getAuthenticationAPIKey(`${name}-user-created`),
      isAuthTypeApiKey: true,
    };
  }

  const createdAPIKey = await withSpan({ name: 'createAPIKey', type: 'rules' }, () =>
    context.createAPIKey(name)
  );
  return { createdAPIKey, isAuthTypeApiKey: false };
};
