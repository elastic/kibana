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
  ALL_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getUnsnoozeActionPolicyUrl,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../../../fixtures';

import { futureIsoDate } from '../../../../common/builders';

/*
 * Custom-role auth (`requestAuth.getApiKeyForCustomRole`) is not yet supported
 * on Elastic Cloud Hosted — ECH falls back to `viewer` for unsupported custom
 * roles, which would silently turn 403 assertions into false positives. This
 * suite is restricted to local stateful (classic) until ECH support lands.
 */
apiTest.describe('Unsnooze action policy API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    adminHeaders = { ...adminCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  // ---------- happy path ----------

  apiTest(
    'unsnooze: unsnoozes a snoozed policy and returns snoozedUntil=null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, futureIsoDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.snoozedUntil).toBeNull();
      expect(response.body.enabled).toBe(true);
    }
  );

  // ---------- state preservation ----------

  apiTest(
    'state: preserves enabled=false when unsnoozing a disabled snoozed policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-unsnooze-disabled' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, futureIsoDate());
      await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBeNull();
      expect(response.body.enabled).toBe(false);
    }
  );

  // ---------- idempotency ----------

  apiTest(
    'idempotency: unsnoozing an already-unsnoozed policy returns snoozedUntil=null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-unsnooze-noop' })
      );

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBeNull();
    }
  );

  // ---------- not found ----------

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getUnsnoozeActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
    });

    expect(response).toHaveStatusCode(404);
  });

  // ---------- schema validation ----------

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(
      getUnsnoozeActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)),
      {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      }
    );

    expect(response).toHaveStatusCode(400);
  });

  // ---------- authorization ----------

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, futureIsoDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBeNull();
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, futureIsoDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
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
        buildCreateActionPolicyData({ name: 'no-access-cannot-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, futureIsoDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
