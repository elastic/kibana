/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALL_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  getActionPolicyUrl,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../../../fixtures';

/*
 * Custom-role auth (`requestAuth.getApiKeyForCustomRole`) is not yet supported
 * on Elastic Cloud Hosted — ECH falls back to `viewer` for unsupported custom
 * roles, which would silently turn 403 assertions into false positives. This
 * suite is restricted to local stateful (classic) until ECH support lands.
 */
apiTest.describe('Upsert action policy API', { tag: '@local-stateful-classic' }, () => {
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

  // ---------- upsert: create-via-PUT ----------

  apiTest(
    'upsert: 201 creates with the supplied id when it does not exist',
    async ({ apiClient }) => {
      const id = 'upsert-create-policy';
      const body = buildCreateActionPolicyData({
        name: 'created-via-put',
        description: 'first version',
      });

      const response = await apiClient.put(getActionPolicyUrl(id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body,
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.id).toBe(id);
      expect(response.body.name).toBe(body.name);
      expect(response.body.description).toBe(body.description);
      expect(response.body.destinations).toStrictEqual(body.destinations);
      expect(response.body.type).toBe('global');
      expect(response.body.enabled).toBe(true);
      expect(response.body.snoozedUntil).toBeNull();
      // On create, updatedAt equals createdAt — there has been no replace yet.
      expect(response.body.updatedAt).toBe(response.body.createdAt);
      expect(response.body.auth.apiKey).toBeUndefined();
    }
  );

  apiTest('type: defaults to "global" on create-via-PUT', async ({ apiClient }) => {
    const id = 'upsert-default-type';

    const response = await apiClient.put(getActionPolicyUrl(id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ name: 'default-type-via-put' }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.type).toBe('global');
  });

  apiTest(
    'type: creates with type:"single_rule" linked to an existing rule via PUT',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-for-upsert-single' } })
      );

      const response = await apiClient.put(getActionPolicyUrl('upsert-single-rule-policy'), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: buildCreateActionPolicyData({
          name: 'single-rule-via-put',
          type: 'single_rule',
          ruleId: rule.id,
        }),
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.type).toBe('single_rule');
      expect(response.body.ruleId).toBe(rule.id);
    }
  );

  // ---------- upsert: replace ----------

  apiTest(
    'upsert: 200 replaces and rotates version+updatedAt, preserves createdAt/createdBy',
    async ({ apiClient, apiServices }) => {
      const id = 'upsert-replace-policy';
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'first-version',
          description: 'before replace',
          matcher: 'env == "production"',
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        }),
        { id }
      );

      const replaced = await apiClient.put(getActionPolicyUrl(id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: buildCreateActionPolicyData({
          name: 'second-version',
          description: 'after replace',
          destinations: [{ type: 'workflow', id: 'wf-2' }],
        }),
      });

      expect(replaced).toHaveStatusCode(200);
      expect(replaced.body.id).toBe(id);

      // Replaced fields take the new values.
      expect(replaced.body.name).toBe('second-version');
      expect(replaced.body.description).toBe('after replace');
      expect(replaced.body.destinations).toStrictEqual([{ type: 'workflow', id: 'wf-2' }]);

      // Audit metadata is preserved across replace.
      expect(replaced.body.createdBy).toBe(created.createdBy);
      expect(replaced.body.createdAt).toBe(created.createdAt);

      // updatedAt advances and version changes; together these prove the SO was
      // rewritten and the API key was rotated. The actual key string is never
      // returned over the wire — see action_policy_client unit tests for direct
      // verification of apiKeyService.create / markApiKeysForInvalidation calls.
      expect(replaced.body.updatedAt).not.toBe(created.createdAt);
      expect(replaced.body.version).not.toBe(created.version);
    }
  );

  apiTest(
    'upsert: replace drops fields not present in the new body',
    async ({ apiClient, apiServices }) => {
      const id = 'upsert-drop-fields-policy';
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'with-optional-fields',
          matcher: 'env == "production"',
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        }),
        { id }
      );

      const replaced = await apiClient.put(getActionPolicyUrl(id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
        body: buildCreateActionPolicyData({ name: 'minimal-replacement' }),
      });

      expect(replaced).toHaveStatusCode(200);
      // PUT fully replaces — fields not in the new body fall back to their
      // documented defaults (null).
      expect(replaced.body.matcher).toBeNull();
      expect(replaced.body.groupBy).toBeNull();
      expect(replaced.body.throttle).toBeNull();
      expect(replaced.body.groupingMode).toBeNull();
    }
  );

  apiTest('upsert: preserves enabled=false on replace', async ({ apiClient, apiServices }) => {
    const id = 'upsert-preserve-disabled-policy';
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'to-be-disabled' }),
      { id }
    );
    await apiServices.alertingV2.actionPolicies.disable(id);

    const replaced = await apiClient.put(getActionPolicyUrl(id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ name: 'replaced-while-disabled' }),
    });

    expect(replaced).toHaveStatusCode(200);
    expect(replaced.body.enabled).toBe(false);
  });

  apiTest('upsert: preserves snoozedUntil on replace', async ({ apiClient, apiServices }) => {
    const id = 'upsert-preserve-snooze-policy';
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'to-be-snoozed' }),
      { id }
    );

    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await apiServices.alertingV2.actionPolicies.snooze(id, snoozedUntil);

    const replaced = await apiClient.put(getActionPolicyUrl(id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ name: 'replaced-while-snoozed' }),
    });

    expect(replaced).toHaveStatusCode(200);
    expect(replaced.body.snoozedUntil).toBe(snoozedUntil);
  });

  // ---------- schema validation ----------
  // The body uses the same createActionPolicyDataSchema as POST /create, which
  // is exhaustively validated in create_action_policy.spec.ts. The cases below
  // cover the FTR-parity set plus the most important cross-field branches so
  // the upsert route's validation wiring is verified independently.

  apiTest('validation: rejects missing name', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-name'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: {
        description: 'no name',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing description', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-description'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: {
        name: 'no-description',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing destinations', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-destinations'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { name: 'incomplete', description: 'no destinations' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects empty destinations array', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-empty-destinations'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ destinations: [] }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects name over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-name-too-long'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects destination with unknown type', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-bad-destination'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({
        destinations: [
          { type: 'email', id: 'wf-1' } as unknown as { type: 'workflow'; id: string },
        ],
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects strategy/groupingMode combo mismatch', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-bad-combo'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({
        groupingMode: 'all',
        throttle: { strategy: 'on_status_change' },
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects time_interval strategy without interval', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-interval'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({
        groupingMode: 'all',
        throttle: { strategy: 'time_interval' },
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects type:"single_rule" without ruleId', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-single-no-rule-id'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ type: 'single_rule' }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects type:"global" with ruleId', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-global-with-rule-id'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: buildCreateActionPolicyData({ type: 'global', ruleId: 'some-rule-id' }),
    });

    expect(response).toHaveStatusCode(400);
  });

  // ---------- authorization ----------

  apiTest(
    'authorization: 201 with full alerting_v2 privileges (write)',
    async ({ apiClient, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);

      const response = await apiClient.put(getActionPolicyUrl('upsert-authorized-write'), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
        body: buildCreateActionPolicyData({ name: 'authorized-write' }),
      });

      expect(response).toHaveStatusCode(201);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);

      const response = await apiClient.put(getActionPolicyUrl('upsert-unauthorized-write'), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: buildCreateActionPolicyData({ name: 'unauthorized-write' }),
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.put(getActionPolicyUrl('upsert-no-access'), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: buildCreateActionPolicyData({ name: 'no-access' }),
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
