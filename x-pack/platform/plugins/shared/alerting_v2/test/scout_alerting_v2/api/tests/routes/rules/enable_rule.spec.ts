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
  getEnableRuleUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Enable rule API', { tag: '@local-stateful-classic' }, () => {
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
    'enable: enables a disabled rule and returns the updated rule with enabled=true',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-enable' } })
      );
      // Start the rule disabled so the endpoint has an actual transition to make.
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: writerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.enabled).toBe(true);

      // Verify the side effect persisted.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.enabled).toBe(true);
    }
  );

  apiTest(
    'idempotency: enabling an already-enabled rule returns enabled=true',
    async ({ apiClient, apiServices }) => {
      // Created rules are enabled by default — no disable step here.
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'already-enabled' } })
      );

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: writerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'state: preserves the rule fields and bumps version/updatedAt after a disable → enable round-trip',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'round-trip' } })
      );
      const disabled = await apiServices.alertingV2.rules.disable(created.id);

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: writerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        ...disabled,
        enabled: true,
        updatedAt: response.body.updatedAt,
        updatedBy: response.body.updatedBy,
        version: response.body.version,
      });
      expect(Date.parse(response.body.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(disabled.updatedAt)
      );
      expect(response.body.version).not.toBe(disabled.version);
    }
  );

  apiTest('status: returns 404 when the rule does not exist', async ({ apiClient }) => {
    const response = await apiClient.post(getEnableRuleUrl('does-not-exist'), {
      headers: writerHeaders,
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  apiTest('validation: rejects ids longer than ID_MAX_LENGTH with a 400', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(getEnableRuleUrl(tooLongId), {
      headers: writerHeaders,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: returns 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'writer-can-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: writerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
      // Verify the rule remained disabled after the failed call.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.enabled).toBe(false);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.enabled).toBe(false);
    }
  );
});
