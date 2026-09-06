/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

const FLEET_INTERNAL_REQUEST_HEADERS: FakeRawRequest['headers'] = {
  'kbn-system-request': 'true',
};

/**
 * Builds a minimal, unauthenticated fake request for Fleet-owned internal
 * install paths that execute outside of an HTTP request context (e.g. Task
 * Manager tasks that are not scheduled with an API key).
 *
 * Do not use this to impersonate a user. It intentionally carries no
 * credentials and is marked as a system/internal request.
 */
export function createFleetInternalRequest(): KibanaRequest {
  const fakeRawRequest: FakeRawRequest = {
    headers: FLEET_INTERNAL_REQUEST_HEADERS,
    auth: { isAuthenticated: false },
  };

  return kibanaRequestFactory(fakeRawRequest);
}
