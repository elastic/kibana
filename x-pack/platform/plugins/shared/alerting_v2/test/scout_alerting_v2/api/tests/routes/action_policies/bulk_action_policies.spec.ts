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
  getBulkActionPoliciesUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const getSnoozeDate = (offsetMs: number = 86_400_000): string =>
  new Date(Date.now() + offsetMs).toISOString();

apiTest.describe('Bulk action policies API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('bulk: enables disabled policies', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-enable-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-enable-2' })
    );
    await apiServices.alertingV2.actionPolicies.disable(p1.id);
    await apiServices.alertingV2.actionPolicies.disable(p2.id);

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: p1.id, action: 'enable' },
          { id: p2.id, action: 'enable' },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);
    expect(response.body.total).toBe(2);
    expect(response.body.errors).toStrictEqual([]);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.enabled).toBe(true);
    expect(updated2.enabled).toBe(true);
  });

  apiTest('bulk: disables enabled policies', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-disable-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-disable-2' })
    );

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: p1.id, action: 'disable' },
          { id: p2.id, action: 'disable' },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.enabled).toBe(false);
    expect(updated2.enabled).toBe(false);
  });

  apiTest('bulk: snoozes policies with snoozedUntil', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-snooze-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-snooze-2' })
    );
    const snoozedUntil = getSnoozeDate();

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: p1.id, action: 'snooze', snoozedUntil },
          { id: p2.id, action: 'snooze', snoozedUntil },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.snoozedUntil).toBe(snoozedUntil);
    expect(updated2.snoozedUntil).toBe(snoozedUntil);
  });

  apiTest('bulk: unsnoozes snoozed policies', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-unsnooze-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-unsnooze-2' })
    );
    const snoozedUntil = getSnoozeDate();
    await apiServices.alertingV2.actionPolicies.snooze(p1.id, snoozedUntil);
    await apiServices.alertingV2.actionPolicies.snooze(p2.id, snoozedUntil);

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: p1.id, action: 'unsnooze' },
          { id: p2.id, action: 'unsnooze' },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.snoozedUntil).toBeNull();
    expect(updated2.snoozedUntil).toBeNull();
  });

  apiTest('bulk: deletes policies', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-delete-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-delete-2' })
    );

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: p1.id, action: 'delete' },
          { id: p2.id, action: 'delete' },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);
    expect(response.body.total).toBe(2);
    expect(response.body.errors).toStrictEqual([]);

    const remaining = await apiServices.alertingV2.actionPolicies.list({ perPage: 100 });
    const remainingIds = remaining.items.map((policy) => policy.id);
    expect(remainingIds).not.toContain(p1.id);
    expect(remainingIds).not.toContain(p2.id);
  });

  apiTest('bulk: rotates API keys', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-update-key-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-update-key-2' })
    );

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: p1.id, action: 'update_api_key' },
          { id: p2.id, action: 'update_api_key' },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);
    expect(response.body.total).toBe(2);
    expect(response.body.errors).toStrictEqual([]);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.name).toBe('bulk-update-key-1');
    expect(updated2.name).toBe('bulk-update-key-2');
    // Rotation proof: SO was rewritten so updatedAt and version advanced.
    expect(updated1.updatedAt).not.toBe(p1.createdAt);
    expect(updated1.version).not.toBe(p1.version);
    expect(updated2.updatedAt).not.toBe(p2.createdAt);
    expect(updated2.version).not.toBe(p2.version);
  });

  apiTest(
    'mixed: enable + disable + snooze + unsnooze in one request',
    async ({ apiClient, apiServices }) => {
      const pEnable = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-mixed-enable' })
      );
      const pDisable = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-mixed-disable' })
      );
      const pSnooze = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-mixed-snooze' })
      );
      const pUnsnooze = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-mixed-unsnooze' })
      );

      await apiServices.alertingV2.actionPolicies.disable(pEnable.id);
      const snoozedUntil = getSnoozeDate();
      await apiServices.alertingV2.actionPolicies.snooze(pUnsnooze.id, snoozedUntil);

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          actions: [
            { id: pEnable.id, action: 'enable' },
            { id: pDisable.id, action: 'disable' },
            { id: pSnooze.id, action: 'snooze', snoozedUntil },
            { id: pUnsnooze.id, action: 'unsnooze' },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.processed).toBe(4);
      expect(response.body.total).toBe(4);
      expect(response.body.errors).toStrictEqual([]);

      const updatedEnable = await apiServices.alertingV2.actionPolicies.get(pEnable.id);
      const updatedDisable = await apiServices.alertingV2.actionPolicies.get(pDisable.id);
      const updatedSnooze = await apiServices.alertingV2.actionPolicies.get(pSnooze.id);
      const updatedUnsnooze = await apiServices.alertingV2.actionPolicies.get(pUnsnooze.id);

      expect(updatedEnable.enabled).toBe(true);
      expect(updatedDisable.enabled).toBe(false);
      expect(updatedSnooze.snoozedUntil).toBe(snoozedUntil);
      expect(updatedUnsnooze.snoozedUntil).toBeNull();
    }
  );

  apiTest('mixed: enable + delete in one request', async ({ apiClient, apiServices }) => {
    const pEnable = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-mixed-del-enable' })
    );
    const pDelete = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-mixed-del-delete' })
    );
    await apiServices.alertingV2.actionPolicies.disable(pEnable.id);

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [
          { id: pEnable.id, action: 'enable' },
          { id: pDelete.id, action: 'delete' },
        ],
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.processed).toBe(2);
    expect(response.body.total).toBe(2);
    expect(response.body.errors).toStrictEqual([]);

    const updatedEnable = await apiServices.alertingV2.actionPolicies.get(pEnable.id);
    expect(updatedEnable.enabled).toBe(true);

    const remaining = await apiServices.alertingV2.actionPolicies.list({ perPage: 100 });
    expect(remaining.items.map((policy) => policy.id)).not.toContain(pDelete.id);
  });

  apiTest(
    'partial failure: reports errors for non-existent ids',
    async ({ apiClient, apiServices }) => {
      const existing = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-partial-failure' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          actions: [
            { id: existing.id, action: 'enable' },
            { id: 'non-existent-id', action: 'disable' },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(2);
      expect(response.body.processed).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('non-existent-id');
    }
  );

  apiTest(
    'partial failure: reports errors for non-existent ids in delete',
    async ({ apiClient, apiServices }) => {
      const existing = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-delete-partial' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          actions: [
            { id: existing.id, action: 'delete' },
            { id: 'non-existent-del-id', action: 'delete' },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.processed).toBe(1);
      expect(response.body.total).toBe(2);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('non-existent-del-id');

      const remaining = await apiServices.alertingV2.actionPolicies.list({ perPage: 100 });
      expect(remaining.items.map((policy) => policy.id)).not.toContain(existing.id);
    }
  );

  apiTest(
    'partial failure: reports errors for non-existent ids in update_api_key',
    async ({ apiClient, apiServices }) => {
      const existing = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-update-key-partial' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          actions: [
            { id: existing.id, action: 'update_api_key' },
            { id: 'non-existent-key-id', action: 'update_api_key' },
          ],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.processed).toBe(1);
      expect(response.body.total).toBe(2);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('non-existent-key-id');
    }
  );

  apiTest('validation: rejects empty actions array', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { actions: [] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects invalid snoozedUntil in snooze action',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-snooze-invalid' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          actions: [{ id: created.id, action: 'snooze', snoozedUntil: 'not-a-date' }],
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects unknown action type', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-unknown-action' })
    );

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [{ id: created.id, action: 'archive' }],
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects snooze action without snoozedUntil',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-snooze-missing-date' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          actions: [{ id: created.id, action: 'snooze' }],
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects empty action id', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { actions: [{ id: '', action: 'enable' }] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects action id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        actions: [{ id: 'a'.repeat(ID_MAX_LENGTH + 1), action: 'enable' }],
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects more than the maximum number of actions', async ({ apiClient }) => {
    const tooManyActions = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => ({
      id: `id-${i}`,
      action: 'enable' as const,
    }));

    const response = await apiClient.post(getBulkActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { actions: tooManyActions },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-bulk' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { actions: [{ id: created.id, action: 'disable' }] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.processed).toBe(1);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-bulk' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { actions: [{ id: created.id, action: 'disable' }] },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-bulk' })
      );

      const response = await apiClient.post(getBulkActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { actions: [{ id: created.id, action: 'disable' }] },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
