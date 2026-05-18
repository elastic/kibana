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
  getSnoozeActionPolicyUrl,
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
apiTest.describe('Snooze action policy API', { tag: '@local-stateful-classic' }, () => {
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
    'snooze: snoozes a policy with a future ISO date and returns snoozedUntil',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze' })
      );
      const snoozedUntil = futureIsoDate();

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: { snoozedUntil },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.snoozedUntil).toBe(snoozedUntil);
      expect(response.body.enabled).toBe(true);
    }
  );

  // ---------- state preservation ----------

  apiTest(
    'state: preserves enabled=false when snoozing a disabled policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze-preserve-enabled' })
      );
      await apiServices.alertingV2.actionPolicies.disable(created.id);
      const snoozedUntil = futureIsoDate();

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: { snoozedUntil },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBe(snoozedUntil);
      expect(response.body.enabled).toBe(false);
    }
  );

  // ---------- idempotency / overwrite ----------

  apiTest(
    'idempotency: updates snoozedUntil when snoozing an already-snoozed policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze-overwrite' })
      );
      const firstDate = futureIsoDate(86_400_000);
      const secondDate = futureIsoDate(172_800_000);

      await apiServices.alertingV2.actionPolicies.snooze(created.id, firstDate);

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: { snoozedUntil: secondDate },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBe(secondDate);
    }
  );

  // ---------- not found ----------

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { snoozedUntil: futureIsoDate() },
    });

    expect(response).toHaveStatusCode(404);
  });

  // ---------- schema validation ----------

  apiTest('validation: rejects an invalid date string', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'test-snooze-invalid-date' })
    );

    const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { snoozedUntil: 'not-a-date' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects a date-only string (must include time component)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze-date-only' })
      );

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        // z.iso.datetime() requires the full ISO 8601 datetime form (with T and time).
        body: { snoozedUntil: '2026-01-01' },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects empty snoozedUntil', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'test-snooze-empty' })
    );

    const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { snoozedUntil: '' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing snoozedUntil', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'test-snooze-missing' })
    );

    const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: {},
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { snoozedUntil: futureIsoDate() },
    });

    expect(response).toHaveStatusCode(400);
  });

  // ---------- authorization ----------

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-snooze' })
      );
      const snoozedUntil = futureIsoDate();

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
        body: { snoozedUntil },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBe(snoozedUntil);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-snooze' })
      );

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { snoozedUntil: futureIsoDate() },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-cannot-snooze' })
      );

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { snoozedUntil: futureIsoDate() },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
