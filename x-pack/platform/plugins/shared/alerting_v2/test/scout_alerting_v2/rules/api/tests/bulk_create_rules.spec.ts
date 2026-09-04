/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const BULK_CREATE_URL = `${testData.RULE_API_PATH}/_bulk_create`;

apiTest.describe('Bulk create rules API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'create: should create enabled rules and persist them',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(BULK_CREATE_URL, {
        headers: writerHeaders,
        body: {
          rules: [
            buildCreateRuleData({ metadata: { name: 'bulk-a' } }),
            buildCreateRuleData({ metadata: { name: 'bulk-b' } }),
          ],
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      expect(response.body.rules).toHaveLength(2);
      expect(response.body.rules.every((rule: { enabled: boolean }) => rule.enabled)).toBe(true);

      const stored = await apiServices.alertingV2.rules.find({ per_page: 100 });
      expect(stored.items).toHaveLength(2);
      expect(stored.items.every((rule) => rule.enabled)).toBe(true);
    }
  );

  apiTest(
    'create: should persist a disabled rule without enabling it',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(BULK_CREATE_URL, {
        headers: writerHeaders,
        body: {
          rules: [
            {
              ...buildCreateRuleData({ metadata: { name: 'bulk-disabled' } }),
              enabled: false,
            },
          ],
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].enabled).toBe(false);

      const stored = await apiServices.alertingV2.rules.get(response.body.rules[0].id);
      expect(stored.enabled).toBe(false);
    }
  );

  apiTest(
    'create: should report RULE_ALREADY_EXISTS for colliding ids and still create the rest',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.upsert(
        'existing-bulk-id',
        buildCreateRuleData({ metadata: { name: 'already-there' } })
      );

      const response = await apiClient.post(BULK_CREATE_URL, {
        headers: writerHeaders,
        body: {
          rules: [
            {
              ...buildCreateRuleData({ metadata: { name: 'collision' } }),
              id: 'existing-bulk-id',
              enabled: false,
            },
            buildCreateRuleData({ metadata: { name: 'fresh-rule' } }),
          ],
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].metadata.name).toBe('fresh-rule');
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        id: 'existing-bulk-id',
        error: { code: 'RULE_ALREADY_EXISTS' },
      });
    }
  );

  apiTest('validation: should reject an empty rules array', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_CREATE_URL, {
      headers: writerHeaders,
      body: { rules: [] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject a body with no rules field', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_CREATE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject arrays longer than MAX_BULK_ITEMS', async ({ apiClient }) => {
    const rules = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) =>
      buildCreateRuleData({ metadata: { name: `rule-${i}` } })
    );
    const response = await apiClient.post(BULK_CREATE_URL, {
      headers: writerHeaders,
      body: { rules },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_CREATE_URL, {
        headers: writerHeaders,
        body: {
          rules: [buildCreateRuleData({ metadata: { name: 'writer-can-bulk-create' } })],
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toHaveLength(1);
    }
  );

  apiTest(
    'authorization: should return 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(BULK_CREATE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: {
          rules: [buildCreateRuleData({ metadata: { name: 'reader-cannot-bulk-create' } })],
        },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(BULK_CREATE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: {
          rules: [buildCreateRuleData({ metadata: { name: 'noaccess-cannot-bulk-create' } })],
        },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
