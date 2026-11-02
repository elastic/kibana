/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedCredentials } from '@kbn/response-ops-scoped-api-keys';
import { encodeApiKey, getUiamApiKeySecret } from '@kbn/response-ops-scoped-api-keys';

import type { RawAction } from '../../types';
import { createEventIdentityApiKeysDisabledError } from './errors';
import type { ConnectorEventIdentity } from './types';

export const authorizationCredentialFromIdentity = (
  identity: ConnectorEventIdentity
): string | undefined => {
  if (identity.uiamApiKey) {
    return getUiamApiKeySecret(identity.uiamApiKey);
  }
  return identity.apiKey;
};

export const identityFromCredentials = ({
  es,
  uiam,
}: ScopedCredentials): ConnectorEventIdentity => {
  const apiKey = es?.id && es.secret ? encodeApiKey(es.id, es.secret) : undefined;
  const uiamApiKey = uiam?.id && uiam.secret ? encodeApiKey(uiam.id, uiam.secret) : undefined;

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

/** Unencrypted saved-object flag. A normal get strips `apiKey` / `uiamApiKey`. */
export const hasInboundEventIdentityAttributes = (attributes: {
  hasInboundEventIdentity?: boolean | null;
}): boolean => attributes.hasInboundEventIdentity === true;
