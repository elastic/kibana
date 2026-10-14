/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { SpaceId } from '@kbn/core-spaces-common';

/** Creates a credential-less request in a space for work done as the internal Kibana user. */
export const createInternalUserRequest = (spaceId: SpaceId): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = { headers: {}, spaceId };
  return kibanaRequestFactory(fakeRawRequest);
};
