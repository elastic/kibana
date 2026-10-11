/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const ROUTING_TAGS_URL = `${testData.INTERNAL_RULE_API_PATH}/routing_tags`;

apiTest.describe('Get rule routing tags API', { tag: testData.API_ENGINE_TAG }, () => {
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const readerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_RULES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'routing tags: should return the routing tags across rules, sorted by usage, ignoring rule tags',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-a', tags: ['prod'], routing_tags: ['sre', 'payments'] },
        })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b', routing_tags: ['sre'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c', tags: ['tags-only'] } })
      );

      const response = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ tags: ['sre', 'payments'] });
    }
  );

  apiTest('routing tags: should filter by search prefix', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-a', routing_tags: ['sre', 'payments'] } })
    );

    const response = await apiClient.get(`${ROUTING_TAGS_URL}?search=pay`, {
      headers: readerHeaders,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ tags: ['payments'] });
  });

  apiTest('validation: should reject unknown query parameters', async ({ apiClient }) => {
    const response = await apiClient.get(`${ROUTING_TAGS_URL}?kind=alert`, {
      headers: readerHeaders,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.get(ROUTING_TAGS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
