/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest, mergeTests } from '@kbn/scout';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { withAuth } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { COMMON_HEADERS } from './constants';

interface AgentBuilderApiWorkerFixtures extends ScoutWorkerFixtures {
  asAdmin: AuthedApiClient;
  asViewer: AuthedApiClient;
  asPrivilegedUser: AuthedApiClient;
}

export const apiTest = mergeTests(baseApiTest, synthtraceFixture).extend<
  ScoutTestFixtures,
  AgentBuilderApiWorkerFixtures
>({
  asAdmin: [
    async ({ apiClient, requestAuth }, use) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      await use(withAuth(apiClient, { ...COMMON_HEADERS, ...apiKeyHeader }));
    },
    { scope: 'worker' },
  ],
  asViewer: [
    async ({ apiClient, requestAuth }, use) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForViewer();
      await use(withAuth(apiClient, { ...COMMON_HEADERS, ...apiKeyHeader }));
    },
    { scope: 'worker' },
  ],
  asPrivilegedUser: [
    async ({ apiClient, requestAuth }, use) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
      await use(withAuth(apiClient, { ...COMMON_HEADERS, ...apiKeyHeader }));
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
