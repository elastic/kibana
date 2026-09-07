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

/**
 * Stale API key attributes to remove from a rule's stored attributes before spreading in a newly
 * created key set. `getApiKeyRuleProperties` omits the UIAM attributes when no UIAM key was
 * minted, so without this the old values would survive the spread.
 *
 * Callers must persist the result as a whole document (`create` with `overwrite: true`, or
 * `bulkCreate`). In a partial saved-object update attributes are merged, so a stripped attribute
 * is merely absent from the payload and keeps its stored value instead of being removed.
 */
export const API_KEY_ATTRIBUTES_TO_STRIP = [
  'apiKey',
  'apiKeyOwner',
  'apiKeyCreatedByUser',
  'uiamApiKey',
  'uiamApiKeyExternal',
] as const;

interface ApiKeyRuleProperties {
  apiKey: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser: boolean | null;
  uiamApiKey?: string | null;
  uiamApiKeyExternal?: boolean | null;
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
  // Framework-granted UIAM keys are stored as `base64(id:key)`. User-created Cloud API
  // keys are raw `essu_` credentials with no key id — store them as-is; alerting never
  // invalidates them, so no id is needed.
  const encodedUiamApiKey =
    encodeApiKey(uiamApiKeyId, uiamApiKey) ?? (createdByUser && uiamApiKey ? uiamApiKey : null);

  return {
    apiKeyOwner: username,
    apiKey: encodedApiKey,
    apiKeyCreatedByUser: createdByUser,
    ...(encodedUiamApiKey ? { uiamApiKey: encodedUiamApiKey } : {}),
    // UIAM's verdict on whether the key is an external (user-created Cloud) API key, captured
    // at authentication time. Rule runs use it to withhold the UIAM shared secret, which UIAM
    // rejects for external keys. Written whenever a UIAM key is written, not only when true,
    // so that it can never disagree with the key it describes: a stale `true` would withhold
    // the shared secret from a freshly granted internal key.
    ...(encodedUiamApiKey ? { uiamApiKeyExternal: apiKey.uiamResult?.external === true } : {}),
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
): Pick<
  RawRule,
  'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey' | 'uiamApiKeyExternal'
> {
  return getApiKeyRuleProperties(apiKey, username, createdByUser);
}

export function apiKeyAsRuleDomainProperties(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): Pick<
  RuleDomain,
  'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey' | 'uiamApiKeyExternal'
> {
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
