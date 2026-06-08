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
  getUnsnoozeActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

export const getSnoozeDate = (offsetMs: number = 86_400_000): string =>
  new Date(Date.now() + offsetMs).toISOString();

apiTest.describe('Unsnooze action policy API', { tag: '@local-stateful-classic' }, () => {
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
    'unsnooze: unsnoozes a snoozed policy and returns snoozedUntil=null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, getSnoozeDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.snoozedUntil).toBeNull();
      expect(response.body.enabled).toBe(true);
    }
  );

  apiTest(
    'state: preserves enabled=false and all other fields when unsnoozing a disabled snoozed policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-unsnooze-disabled' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, getSnoozeDate());
      const disabled = await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        ...disabled,
        snoozedUntil: null,
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
    'idempotency: unsnoozing an already-unsnoozed policy returns snoozedUntil=null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'test-unsnooze-noop' })
      );

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBeNull();
    }
  );

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getUnsnoozeActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(
      getUnsnoozeActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)),
      {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      }
    );

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, getSnoozeDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.snoozedUntil).toBeNull();
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-unsnooze' })
      );
      await apiServices.alertingV2.actionPolicies.snooze(created.id, getSnoozeDate());

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
      await apiServices.alertingV2.actionPolicies.snooze(created.id, getSnoozeDate());

      const response = await apiClient.post(getUnsnoozeActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
