/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ACTION_POLICY_MAX_DESTINATIONS,
  ID_MAX_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_GROUPING_FIELDS,
  MAX_KQL_LENGTH,
  MAX_NAME_LENGTH,
} from '@kbn/alerting-v2-schemas';
import { buildActionPolicyDestinations } from '../../../common/builders';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Create action policy API', { tag: '@local-stateful-classic' }, () => {
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
    'create: creates with auto-generated id and full response shape',
    async ({ apiClient }) => {
      const body = buildCreateActionPolicyData({
        name: 'my-policy',
        description: 'my-policy description',
        destinations: [{ type: 'workflow', id: 'my-workflow-id' }],
        matcher: "env == 'production' && region == 'us-east-1'",
        group_by: ['service.name', 'environment'],
        throttle: { interval: '1m' },
      });
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body,
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.name).toBe(body.name);
      expect(response.body.description).toBe(body.description);
      expect(response.body.destinations).toStrictEqual(body.destinations);
      expect(response.body.matcher).toBe(body.matcher);
      // The API key is server-side only and must never be exposed over the wire.
      expect(response.body.auth.apiKey).toBeUndefined();
    }
  );

  apiTest('create: only required fields returns documented defaults', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'minimal-policy',
        description: 'minimal-policy description',
        destinations: [{ type: 'workflow', id: 'minimal-workflow-id' }],
      },
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body).toMatchObject({
      name: 'minimal-policy',
      description: 'minimal-policy description',
      destinations: [{ type: 'workflow', id: 'minimal-workflow-id' }],
      enabled: true,
      snoozed_until: null,
      matcher: null,
      group_by: null,
      grouping_mode: null,
      throttle: null,
    });
  });

  apiTest('create: per_field grouping with time_interval strategy', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        name: 'per-field-policy',
        group_by: ['host.name'],
        grouping_mode: 'per_field',
        throttle: { strategy: 'time_interval', interval: '5m' },
      }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body).toMatchObject({
      grouping_mode: 'per_field',
      group_by: ['host.name'],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });
  });

  apiTest('create: per_episode grouping with on_status_change strategy', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        name: 'per-episode-policy',
        grouping_mode: 'per_episode',
        throttle: { strategy: 'on_status_change' },
      }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body).toMatchObject({
      grouping_mode: 'per_episode',
      throttle: { strategy: 'on_status_change' },
    });
  });

  apiTest('create: all grouping with every_time strategy', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        name: 'all-mode-policy',
        grouping_mode: 'all',
        throttle: { strategy: 'every_time' },
      }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body).toMatchObject({
      grouping_mode: 'all',
      throttle: { strategy: 'every_time' },
    });
  });

  apiTest(
    'matcher: scopes a policy to a single rule via a rule.id matcher',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-for-scoped-policy' } })
      );

      const matcher = `rule.id: "${rule.id}"`;
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: buildCreateActionPolicyData({
          name: 'rule-scoped-policy',
          matcher,
        }),
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body).toMatchObject({ matcher });
    }
  );

  apiTest('validation: rejects missing name', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        description: 'no name',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects empty name', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ name: '' }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects name over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects missing description', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'no-description',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects description over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        description: 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1),
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects missing destinations', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { name: 'no-destinations', description: 'no-destinations' },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects empty destinations array', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ destinations: [] }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects more than the maximum number of destinations',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: buildCreateActionPolicyData({
          destinations: buildActionPolicyDestinations(ACTION_POLICY_MAX_DESTINATIONS + 1),
        }),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects destination with unknown type', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        destinations: [
          // @ts-expect-error
          { type: 'email', id: 'wf-1' },
        ],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          ...buildCreateActionPolicyData(),
          unknownField: 'x',
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects destination with empty id', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        destinations: [{ type: 'workflow', id: '' }],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects destination with id over max length', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        destinations: [{ type: 'workflow', id: 'a'.repeat(ID_MAX_LENGTH + 1) }],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects matcher over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ matcher: 'a'.repeat(MAX_KQL_LENGTH + 1) }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects group_by with too many fields', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        group_by: Array.from({ length: MAX_GROUPING_FIELDS + 1 }, (_, i) => `field.${i}`),
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects group_by with empty field name', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({ group_by: [''] }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects group_by field name over max length', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        group_by: ['a'.repeat(MAX_FIELD_NAME_LENGTH + 1)],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects unknown grouping_mode', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        // @ts-expect-error
        grouping_mode: 'per_galaxy',
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects unknown throttle.strategy', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        // @ts-expect-error
        throttle: { strategy: 'whenever' },
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects invalid throttle.interval format', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        throttle: { interval: 'not-a-duration' },
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects time_interval strategy without interval', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        grouping_mode: 'all',
        throttle: { strategy: 'time_interval' },
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects per_status_interval strategy without interval',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: buildCreateActionPolicyData({
          grouping_mode: 'per_episode',
          throttle: { strategy: 'per_status_interval' },
        }),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects strategy/grouping_mode combo mismatch', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        grouping_mode: 'all',
        throttle: { strategy: 'on_status_change' },
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('authorization: 201 with full alerting_v2 privileges (write)', async ({ apiClient }) => {
    const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
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

      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
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

      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: buildCreateActionPolicyData({ name: 'no-access' }),
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
