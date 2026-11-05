/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { isUiamCredential, markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import type { ApiKeys } from '../store/api_keys';
import { getUiamApiKeySecret } from '../store/api_keys';

export interface PickedCredential {
  credentialType: 'uiam_api_key' | 'es_api_key' | 'none';
  /** The value sent after `ApiKey `, or `null` when there is no credential. */
  apiKey: string | null;
  /** True when the preferred credential was missing and the other one was used. */
  fellBack: boolean;
}

/** Picks the credential a background run authenticates with, falling back to the other one. */
export const pickCredential = (
  keys: ApiKeys | undefined,
  prefer: 'uiam' | 'es'
): PickedCredential => {
  const uiam = keys?.uiam
    ? { credentialType: 'uiam_api_key' as const, apiKey: keys.uiam.secret }
    : undefined;
  const es = keys?.es
    ? { credentialType: 'es_api_key' as const, apiKey: keys.es.encoded }
    : undefined;
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
 * Builds a fake request that authenticates with `credential`, sent as-is after `ApiKey `. When
 * `external` is set and the credential is a UIAM key, the request is marked so Elasticsearch
 * doesn't attach the UIAM shared secret, which UIAM rejects for external keys.
 */
export const buildFakeRequest = (
  credential: string | null | undefined,
  { spaceId, external }: { spaceId?: string; external?: boolean | null } = {}
): KibanaRequest => {
  const headers: Headers = credential ? { authorization: `ApiKey ${credential}` } : {};
  const fakeRawRequest: FakeRawRequest = {
    headers,
    ...(spaceId !== undefined ? { spaceId: brandSpaceId(spaceId) } : {}),
  };
  const request = kibanaRequestFactory(fakeRawRequest);

  if (external === true && credential && isUiamCredential(getUiamApiKeySecret(credential))) {
    markExternalUiamCredential(request);
  }

  return request;
};

/** Builds the fake request a background run executes under, from the keys a plugin stored. */
export const toFakeRequest = (
  keys: ApiKeys | undefined,
  { spaceId, prefer }: { spaceId?: string; prefer: 'uiam' | 'es' }
): PickedCredential & { request: KibanaRequest } => {
  const credential = pickCredential(keys, prefer);
  const request = buildFakeRequest(credential.apiKey, {
    spaceId,
    external: credential.credentialType === 'uiam_api_key' && keys?.uiam?.external,
  });
  return { request, ...credential };
};
