/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath, KibanaRequest } from '@kbn/core/server';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';

/**
 * Create a KibanaRequest that will "run as" the owner of the given API key, scoped to a space.
 */
export function getFakeKibanaRequest({
  basePathService,
  spaceId,
  apiKey,
}: {
  basePathService: IBasePath;
  spaceId: string;
  apiKey: string | null | undefined;
}): KibanaRequest {
  const requestHeaders: Headers = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);
  const fakeRawRequest: FakeRawRequest = { headers: requestHeaders, path: '/' };
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);
  basePathService.set(fakeRequest, path);
  return fakeRequest;
}
