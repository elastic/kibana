/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRule } from '../../types';
import type { CreateAPIKeyResult } from '../types';
import type { RuleDomain } from '../../application/rule/types';

/**
 * @deprecated TODO (http-versioning) make sure this is deprecated
 * once all of the RawRules are phased out
 */
export function apiKeyAsAlertAttributes(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey'> {
  if (apiKey && apiKey.apiKeysEnabled) {
    const uiamApiKey = apiKey.uiamResult?.api_key;
    const uiamApiKeyId = apiKey.uiamResult?.id;
    // TODO use from security plugin
    return {
      apiKeyOwner: username,
      apiKey: Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64'),
      apiKeyCreatedByUser: createdByUser,
      ...(uiamApiKey ? { uiamApiKey: `${uiamApiKeyId}:${uiamApiKey}` } : {}),
    };
  }
  return {
    apiKeyOwner: null,
    apiKey: null,
    apiKeyCreatedByUser: null,
  };
}

export function apiKeyAsRuleDomainProperties(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): Pick<RuleDomain, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey'> {
  if (apiKey && apiKey.apiKeysEnabled) {
    const uiamApiKey = apiKey.uiamResult?.api_key;
    const uiamApiKeyId = apiKey.uiamResult?.id;

    return {
      apiKeyOwner: username,
      apiKey: Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64'),
      apiKeyCreatedByUser: createdByUser,
      ...(uiamApiKey ? { uiamApiKey: `${uiamApiKeyId}:${uiamApiKey}` } : {}),
    };
  }
  return {
    apiKeyOwner: null,
    apiKey: null,
    apiKeyCreatedByUser: null,
  };
}
