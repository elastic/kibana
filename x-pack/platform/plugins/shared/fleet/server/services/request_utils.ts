/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTTPAuthorizationHeader } from '@kbn/security-plugin/server';
import type { FakeRawRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

export function createKibanaRequestFromAuth(authorizationHeader: HTTPAuthorizationHeader) {
  const requestHeaders: FakeRawRequest['headers'] = {
    authorization: authorizationHeader.toString(),
  };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  // Since we're using API keys and accessing elasticsearch can only be done
  // via a request, we're faking one with the proper authorization headers.
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  return fakeRequest;
}
