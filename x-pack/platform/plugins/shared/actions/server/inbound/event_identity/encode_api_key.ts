/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUiamCredential } from '@kbn/core-security-server';

import type { RawAction } from '../../types';
import { createEventIdentityApiKeysDisabledError } from './errors';
import type { ConnectorEventIdentity } from './types';

/**
 * Grant stores `base64(id:essu_…)`. Only the raw `essu_` secret authenticates; the envelope
 * is parsed as a native ES key and UIAM is never reached.
 */
export const getUiamApiKeySecret = (storedUiamApiKey: string): string => {
  if (isUiamCredential(storedUiamApiKey)) {
    return storedUiamApiKey;
  }

  const [, secret] = Buffer.from(storedUiamApiKey, 'base64').toString().split(':');
  return secret && isUiamCredential(secret) ? secret : storedUiamApiKey;
};

export const authorizationCredentialFromIdentity = (
  identity: ConnectorEventIdentity
): string | undefined => {
  if (identity.uiamApiKey) {
    return getUiamApiKeySecret(identity.uiamApiKey);
  }
  return identity.apiKey;
};

export const encodeApiKey = (id?: string, key?: string): string | undefined => {
  if (!id || !key) {
    return undefined;
  }
  return Buffer.from(`${id}:${key}`).toString('base64');
};

export const identityFromGrantResults = ({
  esResult,
  uiamResult,
}: {
  esResult?: { id: string; api_key: string };
  uiamResult?: { id: string; api_key: string };
}): ConnectorEventIdentity => {
  const apiKey = encodeApiKey(esResult?.id, esResult?.api_key);
  const uiamApiKey = encodeApiKey(uiamResult?.id, uiamResult?.api_key);

  if (!apiKey && !uiamApiKey) {
    throw createEventIdentityApiKeysDisabledError();
  }

  return {
    ...(apiKey ? { apiKey } : {}),
    ...(uiamApiKey ? { uiamApiKey, uiamApiKeyExternal: false } : {}),
  };
};

export const identityFromRawAction = (
  attributes: RawAction
): ConnectorEventIdentity | undefined => {
  const apiKey = attributes.apiKey ?? undefined;
  const uiamApiKey = attributes.uiamApiKey ?? undefined;

  if (!apiKey && !uiamApiKey) {
    return undefined;
  }

  return {
    ...(apiKey ? { apiKey } : {}),
    ...(uiamApiKey
      ? { uiamApiKey, uiamApiKeyExternal: attributes.uiamApiKeyExternal === true }
      : {}),
  };
};

export const toRawActionIdentityAttributes = (
  identity: ConnectorEventIdentity
): Pick<RawAction, 'apiKey' | 'uiamApiKey' | 'uiamApiKeyExternal'> => ({
  ...(identity.apiKey ? { apiKey: identity.apiKey } : {}),
  ...(identity.uiamApiKey
    ? {
        uiamApiKey: identity.uiamApiKey,
        uiamApiKeyExternal: identity.uiamApiKeyExternal === true,
      }
    : {}),
});

export const hasConnectorEventIdentity = (
  identity: ConnectorEventIdentity | undefined
): identity is ConnectorEventIdentity =>
  identity !== undefined && Boolean(identity.apiKey || identity.uiamApiKey);
