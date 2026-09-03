/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawAction } from '../../types';
import { createEventIdentityApiKeysDisabledError } from './errors';
import type { ConnectorEventIdentity } from './types';

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
