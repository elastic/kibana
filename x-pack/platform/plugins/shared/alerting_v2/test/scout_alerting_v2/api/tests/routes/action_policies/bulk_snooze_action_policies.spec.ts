/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH, MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getBulkSnoozeActionPoliciesUrl,
  getSnoozeDate,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Bulk snooze action policies API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('snooze: snoozes policies with snoozedUntil', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-snooze-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-snooze-2' })
    );
    const snoozedUntil = getSnoozeDate();

    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [p1.id, p2.id], snoozedUntil },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.affected_count).toBe(2);
    expect(response.body.errors).toStrictEqual([]);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.snoozedUntil).toBe(snoozedUntil);
    expect(updated2.snoozedUntil).toBe(snoozedUntil);
  });

  apiTest(
    'snooze: reports a per-item error for a non-existent id',
    async ({ apiClient, apiServices }) => {
      const existing = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-snooze-partial' })
      );

      const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { ids: [existing.id, 'non-existent-id'], snoozedUntil: getSnoozeDate() },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('non-existent-id');
      expect(response.body.errors[0].error.code).toBe('ACTION_POLICY_NOT_FOUND');
    }
  );

  apiTest('validation: rejects an invalid snoozedUntil', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-snooze-invalid' })
    );

    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [created.id], snoozedUntil: 'not-a-date' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects a missing snoozedUntil', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-snooze-missing-date' })
    );

    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [created.id] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [], snoozedUntil: getSnoozeDate() },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects a body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { ids: ['some-id'], snoozedUntil: getSnoozeDate(), unknownField: 'x' },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects an empty id', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [''], snoozedUntil: getSnoozeDate() },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects an id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: ['a'.repeat(ID_MAX_LENGTH + 1)], snoozedUntil: getSnoozeDate() },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects more than the maximum number of ids', async ({ apiClient }) => {
    const tooManyIds = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`);

    const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: tooManyIds, snoozedUntil: getSnoozeDate() },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-bulk-snooze' })
      );

      const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { ids: [created.id], snoozedUntil: getSnoozeDate() },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-bulk-snooze' })
      );

      const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { ids: [created.id], snoozedUntil: getSnoozeDate() },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-bulk-snooze' })
      );

      const response = await apiClient.post(getBulkSnoozeActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [created.id], snoozedUntil: getSnoozeDate() },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
