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
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  getActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Upsert action policy API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
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
    'upsert: 201 creates with the supplied id when it does not exist',
    async ({ apiClient }) => {
      const id = 'upsert-create-policy';
      const body = buildCreateActionPolicyData({
        name: 'created-via-put',
        description: 'first version',
      });

      const response = await apiClient.put(getActionPolicyUrl(id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body,
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.id).toBe(id);
      expect(response.body.name).toBe(body.name);
      expect(response.body.description).toBe(body.description);
      expect(response.body.destinations).toStrictEqual(body.destinations);
      expect(response.body.enabled).toBe(true);
      expect(response.body.snoozedUntil).toBeNull();
      // On create, updatedAt equals createdAt — there has been no replace yet.
      expect(response.body.updatedAt).toBe(response.body.createdAt);
      expect(response.body.auth.apiKey).toBeUndefined();
    }
  );

  apiTest(
    'matcher: scopes a policy to a single rule via a rule.id matcher on create-via-PUT',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-for-upsert-scoped' } })
      );

      const matcher = `rule.id: "${rule.id}"`;
      const response = await apiClient.put(getActionPolicyUrl('upsert-rule-scoped-policy'), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: buildCreateActionPolicyData({
          name: 'rule-scoped-via-put',
          matcher,
        }),
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.matcher).toBe(matcher);
    }
  );

  apiTest(
    'upsert: 200 replaces and rotates version+updatedAt, preserves createdAt/createdBy',
    async ({ apiClient, apiServices }) => {
      const id = 'upsert-replace-policy';
      const created = await apiServices.alertingV2.actionPolicies.upsert(
        id,
        buildCreateActionPolicyData({
          name: 'first-version',
          description: 'before replace',
          matcher: 'env == "production"',
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        })
      );

      const replaced = await apiClient.put(getActionPolicyUrl(id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: buildCreateActionPolicyData({
          name: 'second-version',
          description: 'after replace',
          destinations: [{ type: 'workflow', id: 'wf-2' }],
        }),
      });

      expect(replaced).toHaveStatusCode(200);
      expect(replaced.body.id).toBe(id);

      expect(replaced.body.name).toBe('second-version');
      expect(replaced.body.description).toBe('after replace');
      expect(replaced.body.destinations).toStrictEqual([{ type: 'workflow', id: 'wf-2' }]);

      expect(replaced.body.createdBy).toBe(created.createdBy);
      expect(replaced.body.createdAt).toBe(created.createdAt);

      expect(replaced.body.updatedAt).not.toBe(created.createdAt);
      expect(replaced.body.version).not.toBe(created.version);
    }
  );

  apiTest(
    'upsert: replace drops fields not present in the new body',
    async ({ apiClient, apiServices }) => {
      const id = 'upsert-drop-fields-policy';
      await apiServices.alertingV2.actionPolicies.upsert(
        id,
        buildCreateActionPolicyData({
          name: 'with-optional-fields',
          matcher: 'env == "production"',
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        })
      );

      const replaced = await apiClient.put(getActionPolicyUrl(id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: buildCreateActionPolicyData({ name: 'minimal-replacement' }),
      });

      expect(replaced).toHaveStatusCode(200);
      expect(replaced.body.matcher).toBeNull();
      expect(replaced.body.groupBy).toBeNull();
      expect(replaced.body.throttle).toBeNull();
      expect(replaced.body.groupingMode).toBeNull();
    }
  );

  apiTest('upsert: preserves enabled=false on replace', async ({ apiClient, apiServices }) => {
    const id = 'upsert-preserve-disabled-policy';
    await apiServices.alertingV2.actionPolicies.upsert(
      id,
      buildCreateActionPolicyData({ name: 'to-be-disabled' })
    );
    await apiServices.alertingV2.actionPolicies.disable(id);

    const replaced = await apiClient.put(getActionPolicyUrl(id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ name: 'replaced-while-disabled' }),
    });

    expect(replaced).toHaveStatusCode(200);
    expect(replaced.body.enabled).toBe(false);
  });

  apiTest('upsert: preserves snoozedUntil on replace', async ({ apiClient, apiServices }) => {
    const id = 'upsert-preserve-snooze-policy';
    await apiServices.alertingV2.actionPolicies.upsert(
      id,
      buildCreateActionPolicyData({ name: 'to-be-snoozed' })
    );

    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await apiServices.alertingV2.actionPolicies.snooze(id, snoozedUntil);

    const replaced = await apiClient.put(getActionPolicyUrl(id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ name: 'replaced-while-snoozed' }),
    });

    expect(replaced).toHaveStatusCode(200);
    expect(replaced.body.snoozedUntil).toBe(snoozedUntil);
  });

  apiTest('validation: rejects missing name', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-name'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        description: 'no name',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing description', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-description'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'no-description',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing destinations', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-destinations'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { name: 'incomplete', description: 'no destinations' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects empty destinations array', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-empty-destinations'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ destinations: [] }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects name over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-name-too-long'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects destination with unknown type', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-bad-destination'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        destinations: [
          // @ts-expect-error
          { type: 'email', id: 'wf-1' },
        ],
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.put(getActionPolicyUrl('upsert-unknown-field'), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          ...buildCreateActionPolicyData(),
          unknownField: 'x',
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects strategy/groupingMode combo mismatch', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-bad-combo'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        groupingMode: 'all',
        throttle: { strategy: 'on_status_change' },
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects time_interval strategy without interval', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-missing-interval'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        groupingMode: 'all',
        throttle: { strategy: 'time_interval' },
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('authorization: 201 with full alerting_v2 privileges (write)', async ({ apiClient }) => {
    const response = await apiClient.put(getActionPolicyUrl('upsert-authorized-write'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ name: 'authorized-write' }),
    });

    expect(response).toHaveStatusCode(201);
  });

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );

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
