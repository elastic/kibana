/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core/server';

export function createFakeRequestBoundToDefaultSpace(request: KibanaRequest): KibanaRequest {
  const requestHeaders: Headers = {
    authorization: request.headers.authorization ?? '',
  };

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);
  return fakeRequest;
}
