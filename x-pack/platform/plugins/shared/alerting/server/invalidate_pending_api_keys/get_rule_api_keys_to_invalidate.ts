/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeStoredApiKey,
  getApiKeyInvalidationTargets,
} from '@kbn/response-ops-scoped-api-keys';

export interface RuleApiKeys {
  apiKey?: string | null;
  uiamApiKey?: string | null;
  apiKeyCreatedByUser?: boolean | null;
}

/** Returns the stored API keys of a rule that alerting owns and must invalidate, ES key first. */
export const getRuleApiKeysToInvalidate = ({
  apiKey,
  uiamApiKey,
  apiKeyCreatedByUser,
}: RuleApiKeys): string[] => {
  const targets = getApiKeyInvalidationTargets({
    createdByUser: apiKeyCreatedByUser === true,
    esApiKeyId: apiKey ? decodeStoredApiKey(apiKey).id : undefined,
    uiamApiKeyId: uiamApiKey ? decodeStoredApiKey(uiamApiKey).id : undefined,
    uiamApiKey: uiamApiKey ?? undefined,
  });

  return targets.flatMap((target) => {
    const stored = target.uiamApiKey ? uiamApiKey : apiKey;
    return stored ? [stored] : [];
  });
};
