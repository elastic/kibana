/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Delete rule API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('delete: returns 204 and removes the rule', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-to-delete' } })
    );
    const response = await apiClient.delete(getRuleUrl(created.id), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(204);
    expect(response.body).toStrictEqual({});

    const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
    expect(remaining.items.map((rule) => rule.id)).not.toContain(created.id);
    expect(remaining.total).toBe(0);
  });

  apiTest('status: returns 404 when the rule does not exist', async ({ apiClient }) => {
    const response = await apiClient.delete(getRuleUrl('does-not-exist'), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest('validation: rejects ids longer than ID_MAX_LENGTH with a 400', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.delete(getRuleUrl(tooLongId), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: returns 204 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'writer-can-delete' } })
      );
      const response = await apiClient.delete(getRuleUrl(created.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(204);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-delete' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.delete(getRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(403);
      // Verify the rule is still present after the failed delete.
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((rule) => rule.id)).toContain(created.id);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-delete' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.delete(getRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(403);
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((rule) => rule.id)).toContain(created.id);
    }
  );
});
