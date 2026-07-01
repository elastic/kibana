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
  buildCreateRuleData,
  getActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Get action policy API', { tag: '@local-stateful-classic' }, () => {
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const readerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_READ_ROLE
    );
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest(
    'get: returns full action policy by id with all schema fields populated',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-name',
          description: 'policy-description',
          destinations: [{ type: 'workflow', id: 'policy-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
          throttle: { interval: '10m' },
        })
      );

      const response = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
      expect(typeof response.body.version).toBe('string');
      expect(response.body.name).toBe('policy-name');
      expect(response.body.description).toBe('policy-description');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'policy-workflow-id' },
      ]);
      expect(response.body.matcher).toBe("env == 'production' && region == 'us-east-1'");
      expect(response.body.groupBy).toStrictEqual(['service.name']);
      expect(response.body.throttle).toStrictEqual({ interval: '10m' });
      expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
      expect(new Date(response.body.updatedAt).toISOString()).toBe(response.body.updatedAt);
      expect(typeof response.body.auth.owner).toBe('string');
      expect(response.body.auth.apiKey).toBeUndefined();
    }
  );

  apiTest(
    'get: returns documented defaults for a minimally-created policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create({
        name: 'minimal-policy',
        description: 'minimal-policy description',
        destinations: [{ type: 'workflow', id: 'minimal-workflow-id' }],
      });

      const response = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: created.id,
        enabled: true,
        snoozedUntil: null,
        matcher: null,
        groupBy: null,
        groupingMode: null,
        throttle: null,
      });
    }
  );

  apiTest(
    'get: returns the rule.id matcher for a rule-scoped policy',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-for-get-scoped' } })
      );
      const matcher = `rule.id: "${rule.id}"`;
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'rule-scoped-policy',
          matcher,
        })
      );

      const response = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toBe(matcher);
    }
  );

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.get(getActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.get(getActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-can-get' })
      );

      const response = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
    }
  );

  apiTest(
    'authorization: 200 with full alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-also-get' })
      );

      const response = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'forbidden-get' })
      );

      const response = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
