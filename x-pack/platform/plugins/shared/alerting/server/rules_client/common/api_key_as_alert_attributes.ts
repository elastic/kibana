/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import type { RawRule } from '../../types';
import type { CreateAPIKeyResult } from '../types';
import type { RuleDomain } from '../../application/rule/types';
import {
  MISSING_UIAM_API_KEY_TAG,
  PROVISION_UIAM_API_KEYS_FEATURE_FLAG,
} from '../../application/rule/constants';

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

/**
 * Determines if the missing UIAM API key tag should be added to a rule.
 * The tag is added when:
 * - The environment is serverless
 * - The feature flag for provisioning UIAM API keys is enabled
 * - uiamApiKey is not set (null/undefined)
 * - AND apiKeyCreatedByUser is false (system-created API key)
 *
 * This indicates that the UIAM key rollout attempted to create a UIAM key but failed.
 */
export async function shouldAddMissingUiamKeyTag(
  uiamApiKey: string | null | undefined,
  apiKeyCreatedByUser: boolean | null | undefined,
  isServerless: boolean,
  featureFlags: FeatureFlagsStart
): Promise<boolean> {
  const isFeatureFlagEnabled = await featureFlags.getBooleanValue(
    PROVISION_UIAM_API_KEYS_FEATURE_FLAG,
    false
  );
  return isServerless && isFeatureFlagEnabled && !uiamApiKey && apiKeyCreatedByUser === false;
}

/**
 * Adds the missing UIAM API key tag to the tags array if needed.
 * Returns a new array with the tag appended if the condition is met.
 */
export async function addMissingUiamKeyTagIfNeeded(
  tags: string[],
  uiamApiKey: string | null | undefined,
  apiKeyCreatedByUser: boolean | null | undefined,
  isServerless: boolean,
  featureFlags: FeatureFlagsStart
): Promise<string[]> {
  if (
    await shouldAddMissingUiamKeyTag(uiamApiKey, apiKeyCreatedByUser, isServerless, featureFlags)
  ) {
    // Avoid duplicates
    if (!tags.includes(MISSING_UIAM_API_KEY_TAG)) {
      return [...tags, MISSING_UIAM_API_KEY_TAG];
    }
  }
  return tags;
}
