/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { SpaceId } from '@kbn/core-spaces-common';

// Requests created for internal-user rules client work. A WeakSet lets event
// subscribers recognize them without adding a flag to KibanaRequest.
const internalUserRequests = new WeakSet<KibanaRequest>();

/** Creates a credential-less request in a space for work done as the internal Kibana user. */
export const createInternalUserRequest = (spaceId: SpaceId): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = { headers: {}, spaceId };
  const request = kibanaRequestFactory(fakeRawRequest);
  internalUserRequests.add(request);
  return request;
};

/** Whether the request was created by {@link createInternalUserRequest}, so no user is behind it. */
export const isInternalUserRequest = (request: KibanaRequest): boolean =>
  internalUserRequests.has(request);
