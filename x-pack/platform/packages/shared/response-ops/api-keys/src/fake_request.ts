/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { getUiamApiKeySecret, type StoredApiKeys } from './stored_keys';

export type CredentialType = 'uiam_api_key' | 'es_api_key' | 'none';

export interface FakeRequestResult {
  request: KibanaRequest;
  credentialType: CredentialType;
  /** The value sent after `ApiKey `, or `null` when there is no credential. */
  apiKey: string | null;
  /** True when the preferred credential was missing and the other one was used. */
  fellBack: boolean;
}

const pickCredential = (
  { apiKey, uiamApiKey }: StoredApiKeys,
  prefer: 'uiam' | 'es'
): Pick<FakeRequestResult, 'credentialType' | 'apiKey' | 'fellBack'> => {
  const uiam = uiamApiKey
    ? { credentialType: 'uiam_api_key' as const, apiKey: getUiamApiKeySecret(uiamApiKey) }
    : undefined;
  const es = apiKey ? { credentialType: 'es_api_key' as const, apiKey } : undefined;
  const [preferred, other] = prefer === 'uiam' ? [uiam, es] : [es, uiam];

  if (preferred) {
    return { ...preferred, fellBack: false };
  }
  if (other) {
    return { ...other, fellBack: true };
  }
  return { credentialType: 'none', apiKey: null, fellBack: false };
};

/**
 * Builds the fake request a background run executes under, from the plugin's stored keys.
 * An external (user-created Cloud) UIAM key is marked so Elasticsearch doesn't attach the UIAM
 * shared secret, which UIAM rejects for external keys.
 */
export const toFakeRequest = (
  stored: StoredApiKeys,
  { spaceId, prefer }: { spaceId: string; prefer: 'uiam' | 'es' }
): FakeRequestResult => {
  const credential = pickCredential(stored, prefer);
  const headers: Headers = credential.apiKey
    ? { authorization: `ApiKey ${credential.apiKey}` }
    : {};
  const fakeRawRequest: FakeRawRequest = { headers, spaceId: brandSpaceId(spaceId) };
  const request = kibanaRequestFactory(fakeRawRequest);

  if (credential.credentialType === 'uiam_api_key' && stored.uiamApiKeyExternal === true) {
    markExternalUiamCredential(request);
  }

  return { request, ...credential };
};
