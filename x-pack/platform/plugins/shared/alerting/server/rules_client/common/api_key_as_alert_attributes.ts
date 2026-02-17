/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRule } from '../../types';
import type { CreateAPIKeyResult } from '../types';
import type { RuleDomain } from '../../application/rule/types';

interface ApiKeyRuleProperties {
  apiKey: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser: boolean | null;
  uiamApiKey?: string | null;
}

const encodeApiKey = (id?: string, key?: string): string | null => {
  return id && key ? Buffer.from(`${id}:${key}`).toString('base64') : null;
};

const getApiKeyRuleProperties = (
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): ApiKeyRuleProperties => {
  if (!apiKey || !apiKey.apiKeysEnabled) {
    return {
      apiKeyOwner: null,
      apiKey: null,
      apiKeyCreatedByUser: null,
    };
  }

  const esApiKey = apiKey.result?.api_key;
  const esApiKeyId = apiKey.result?.id;
  const uiamApiKey = apiKey.uiamResult?.api_key;
  const uiamApiKeyId = apiKey.uiamResult?.id;

  if (esApiKey && uiamApiKey && createdByUser) {
    throw new Error(
      'Both ES and UIAM API keys were created for a rule, but only one should be created when the API key is created by a user. This should never happen.'
    );
  }

  const encodedApiKey = encodeApiKey(esApiKeyId, esApiKey);
  const encodedUiamApiKey = encodeApiKey(uiamApiKeyId, uiamApiKey);

  return {
    apiKeyOwner: username,
    apiKey: encodedApiKey,
    apiKeyCreatedByUser: createdByUser,
    ...(encodedUiamApiKey ? { uiamApiKey: encodedUiamApiKey } : {}),
  };
};

/**
 * @deprecated TODO (http-versioning) make sure this is deprecated
 * once all of the RawRules are phased out
 */
export function apiKeyAsAlertAttributes(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey'> {
  return getApiKeyRuleProperties(apiKey, username, createdByUser);
}

export function apiKeyAsRuleDomainProperties(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): Pick<RuleDomain, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey'> {
  return getApiKeyRuleProperties(apiKey, username, createdByUser);
}
