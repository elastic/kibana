/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defineApiKeyStorage,
  encodeUiamApiKey,
  toEsApiKey,
  toUiamApiKey,
} from '@kbn/response-ops-api-keys';
export interface RuleApiKeyAttributes {
  apiKey?: string | null;
  apiKeyCreatedByUser?: boolean | null;
  uiamApiKey?: string | null;
  uiamApiKeyExternal?: boolean | null;
}

/**
 * How a rule stores its API keys. Granted UIAM keys are stored as `base64(id:essu_…)` and
 * user-created Cloud API keys as the raw secret. `uiamApiKeyExternal` is written with every UIAM
 * key so a stale `true` can't withhold the shared secret from a newly granted internal key.
 */
export const ruleApiKeyStorage = defineApiKeyStorage<RuleApiKeyAttributes>({
  write: ({ createdByUser, es, uiam }) => ({
    apiKey: es?.encoded ?? null,
    apiKeyCreatedByUser: createdByUser,
    ...(uiam ? { uiamApiKey: encodeUiamApiKey(uiam), uiamApiKeyExternal: uiam.external } : {}),
  }),
  read: ({ apiKey, uiamApiKey, apiKeyCreatedByUser, uiamApiKeyExternal }) => {
    if (!apiKey && !uiamApiKey) {
      return undefined;
    }
    return {
      createdByUser: apiKeyCreatedByUser === true,
      ...(apiKey ? { es: toEsApiKey(apiKey) } : {}),
      ...(uiamApiKey ? { uiam: toUiamApiKey(uiamApiKey, { external: uiamApiKeyExternal }) } : {}),
    };
  },
});
