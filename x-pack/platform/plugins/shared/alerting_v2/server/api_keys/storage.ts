/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUiamCredential } from '@kbn/core-security-server';
import {
  defineApiKeyStorage,
  encodeUiamApiKey,
  getUiamApiKeySecret,
  toEsApiKey,
  toUiamApiKey,
} from '@kbn/response-ops-api-keys';

export interface ActionPolicyApiKeyAttributes {
  /** `base64(id:secret)` of an ES key, or `base64(id:essu_…)` of a UIAM key. */
  apiKey?: string;
  apiKeyCreatedByUser?: boolean;
}

/**
 * How an action policy stores its API key: a single key in `apiKey`. The external verdict isn't
 * stored, so a policy never runs with a user-created Cloud API key.
 */
export const actionPolicyApiKeyStorage = defineApiKeyStorage<ActionPolicyApiKeyAttributes>({
  write: ({ createdByUser, es, uiam }) => ({
    apiKey: uiam ? encodeUiamApiKey(uiam) : es?.encoded,
    apiKeyCreatedByUser: createdByUser,
  }),
  read: ({ apiKey, apiKeyCreatedByUser }) => {
    if (!apiKey) {
      return undefined;
    }
    return {
      createdByUser: apiKeyCreatedByUser === true,
      ...(isUiamCredential(getUiamApiKeySecret(apiKey))
        ? { uiam: toUiamApiKey(apiKey) }
        : { es: toEsApiKey(apiKey) }),
    };
  },
});
