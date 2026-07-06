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
  getSnoozeActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const getSnoozeDate = (offsetMs: number = 86_400_000): string =>
  new Date(Date.now() + offsetMs).toISOString();

apiTest.describe('Snooze action policy API', { tag: '@local-stateful-classic' }, () => {
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
    'snooze: snoozes a policy with a future ISO date and returns snoozedUntil',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze' })
      );
      const snoozedUntil = getSnoozeDate();

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { snoozedUntil },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.snoozedUntil).toBe(snoozedUntil);
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'state: preserves enabled=false and all other fields when snoozing a disabled policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze-preserve-enabled' })
      );
      const disabled = await apiServices.alertingV2.actionPolicies.disable(created.id);
      const snoozedUntil = getSnoozeDate();

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { snoozedUntil },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        ...disabled,
        snoozedUntil,
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

  apiTest(
    'idempotency: updates snoozedUntil when snoozing an already-snoozed policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-snooze-overwrite' })
      );
      const firstDate = getSnoozeDate(86_400_000);
      const secondDate = getSnoozeDate(172_800_000);

      await apiServices.alertingV2.actionPolicies.snooze(created.id, firstDate);

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { snoozedUntil: secondDate },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBe(secondDate);
    }
  );

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { snoozedUntil: getSnoozeDate() },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('validation: rejects an invalid date string', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'test-snooze-invalid-date' })
    );

    const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
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
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
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
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { snoozedUntil: '' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing snoozedUntil', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'test-snooze-missing' })
    );

    const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {},
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { snoozedUntil: getSnoozeDate() },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-snooze' })
      );
      const snoozedUntil = getSnoozeDate();

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { snoozedUntil },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBe(snoozedUntil);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-snooze' })
      );

      const response = await apiClient.post(getSnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { snoozedUntil: getSnoozeDate() },
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
        body: { snoozedUntil: getSnoozeDate() },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
