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
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getEnableActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Enable action policy API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_ALL_ROLE
    );
    writerHeaders = { ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest(
    'enable: enables a disabled action policy and returns enabled=true',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-enable' })
      );
      await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'idempotency: enabling an already-enabled policy returns enabled=true',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-enable-noop' })
      );

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'state: preserves snoozedUntil and all other fields after a disable → enable round-trip',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-enable-keep-snooze' })
      );
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();

      await apiServices.alertingV2.actionPolicies.snooze(created.id, futureDate);
      const disabled = await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
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

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getEnableActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ACTION_POLICY_NOT_FOUND');
  });

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(getEnableActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-enable' })
      );
      await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-enable' })
      );
      await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-cannot-enable' })
      );
      await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
