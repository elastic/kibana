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

export interface BuildApiKeyFakeRequestOpts {
  /** The credential sent as `ApiKey <apiKey>`. Without it the request carries no authorization. */
  apiKey?: string;
  spaceId: string;
  uiamApiKeyExternal?: boolean;
}

/** Builds a fake `KibanaRequest` authenticated with a stored API key, scoped to a space. */
export const buildApiKeyFakeRequest = ({
  apiKey,
  spaceId,
  uiamApiKeyExternal,
}: BuildApiKeyFakeRequestOpts): KibanaRequest => {
  const headers: Headers = apiKey ? { authorization: `ApiKey ${apiKey}` } : {};
  const fakeRawRequest: FakeRawRequest = {
    headers,
    spaceId: brandSpaceId(spaceId),
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  // UIAM rejects an external (user-created Cloud) key presented with the UIAM shared secret.
  if (apiKey && uiamApiKeyExternal === true) {
    markExternalUiamCredential(fakeRequest);
  }

  return fakeRequest;
};
