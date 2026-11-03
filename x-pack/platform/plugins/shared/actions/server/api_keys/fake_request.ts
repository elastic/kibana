/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers, FakeRawRequest, KibanaRequest } from '@kbn/core-http-server';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { SpaceId } from '@kbn/core-spaces-common';

/** Builds the fake request an action task executes under, from its stored API key. */
export const getFakeRequest = (
  apiKey: string | undefined,
  spaceId: SpaceId,
  uiamApiKeyExternal?: boolean
): KibanaRequest => {
  const requestHeaders: Headers = {};
  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId,
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  // An external (user-created Cloud) UIAM API key must not be presented to Elasticsearch with the
  // UIAM shared secret - UIAM rejects external keys carrying client authentication. The verdict is
  // UIAM's own, captured when the rule was created and persisted on the action task params.
  // Framework-minted UIAM keys (flag absent) keep receiving the shared secret.
  if (apiKey && uiamApiKeyExternal === true) {
    markExternalUiamCredential(fakeRequest);
  }

  return fakeRequest;
};
