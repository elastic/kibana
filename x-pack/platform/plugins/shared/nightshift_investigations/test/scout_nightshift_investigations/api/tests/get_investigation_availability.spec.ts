/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  COMMON_HEADERS,
  INVESTIGATIONS_READ_ROLE,
  INVESTIGATIONS_WRITE_ROLE,
  NO_AGENT_BUILDER_ROLE,
} from '../fixtures';

const AVAILABILITY_PATH = 'internal/nightshift/investigations/availability';

apiTest.describe(
  'GET /internal/nightshift/investigations/availability',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'returns availability for a user with agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.get(AVAILABILITY_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(typeof (response.body as { available: boolean }).available).toBe('boolean');
      }
    );

    apiTest(
      'returns 403 for a user with only agentBuilder:read',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
        const response = await apiClient.get(AVAILABILITY_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
        const response = await apiClient.get(AVAILABILITY_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
