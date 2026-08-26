/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import { apiTest, COMMON_HEADERS, NO_AGENT_BUILDER_ROLE } from '../fixtures';

const INVESTIGATIONS_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['read'] }, spaces: ['*'] }],
};

apiTest.describe(
  'GET /internal/nightshift/investigations/{id}',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('returns 404 for a non-existent investigation id', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
      const response = await apiClient.get('internal/nightshift/investigations/non-existent-id', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 403 for a user without agentBuilder:read', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
      const response = await apiClient.get('internal/nightshift/investigations/some-id', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });
  }
);
