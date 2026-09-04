/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRule } from '../../types';
import type { CreateAPIKeyResult } from '../types';
import type { RuleDomain } from '../../application/rule/types';
import { MISSING_UIAM_API_KEY_TAG } from '../../application/rule/constants';

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
    // rejects for external keys. Written whenever a UIAM key is written, not only when true:
    // `updateRuleApiKey` and `enableRule` persist through a partial saved-object update, where
    // omitting the attribute leaves the previously stored value in place. A stale `true` would
    // then withhold the shared secret from a freshly granted internal key.
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
 * - UIAM API keys are granted in this deployment (`xpack.security.uiam.enabled`)
 * - uiamApiKey is not set (null/undefined)
 *
 * Without the `shouldGrantUiam` check every rule would get the tag on deployments where
 * UIAM is off, since none of them has a UIAM key to begin with.
 */
export function shouldAddMissingUiamKeyTag(
  uiamApiKey: string | null | undefined,
  isServerless: boolean,
  shouldGrantUiam: boolean | undefined
): boolean {
  return isServerless && !!shouldGrantUiam && !uiamApiKey;
}

/**
 * Adds the missing UIAM API key tag to the tags array if needed.
 * Returns a new array with the tag appended if the condition is met.
 */
export function addMissingUiamKeyTagIfNeeded(
  tags: string[],
  uiamApiKey: string | null | undefined,
  isServerless: boolean,
  shouldGrantUiam: boolean | undefined
): string[] {
  if (shouldAddMissingUiamKeyTag(uiamApiKey, isServerless, shouldGrantUiam)) {
    // Avoid duplicates
    if (!tags.includes(MISSING_UIAM_API_KEY_TAG)) {
      return [...tags, MISSING_UIAM_API_KEY_TAG];
    }
  }
  return tags;
}
